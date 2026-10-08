import assert from 'node:assert/strict'
import test from 'node:test'
import { Readable } from 'node:stream'
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { careerOpsRuntimePlugin, dispatchCareerOpsRequest, isTrustedCareerRequest } from '../career-runtime.mjs'
import { MAX_RESUME_SYNC_REQUEST_BYTES, ResumeSyncError } from '../../career-ops/resume-sync.mjs'

test('career runtime rejects cross-origin browser requests to the loopback server', () => {
  const request = {
    socket: { remoteAddress: '127.0.0.1' },
    headers: { host: '127.0.0.1:3000', origin: 'https://malicious.example' },
  }
  assert.equal(isTrustedCareerRequest(request), false)
  assert.equal(isTrustedCareerRequest({
    ...request,
    headers: { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000' },
  }), true)
})

test('career runtime creates a Job before running the local workflow stage', async () => {
  const calls = []
  const kernel = {
    async createJob(payload) {
      calls.push(['createJob', payload])
      return { id: 'job-001', slug: 'varian-product-lead', ...payload }
    },
    async runStage(payload) {
      calls.push(['runStage', payload])
      return { jobId: payload.jobId, slug: 'varian-product-lead', pdfPath: '/generated-resumes/varian-product-lead.pdf' }
    },
  }

  const result = await dispatchCareerOpsRequest({
    method: 'POST',
    pathname: '/workflow',
    payload: {
      company: 'Varian',
      roleTitle: 'Product Lead',
      jdText: 'Lead medical device portfolio strategy.',
      sourceUrl: 'https://jobs.example.test/varian',
    },
    kernel,
  })

  assert.deepEqual(calls, [
    ['createJob', {
      company: 'Varian',
      roleTitle: 'Product Lead',
      jdText: 'Lead medical device portfolio strategy.',
      sourceUrl: 'https://jobs.example.test/varian',
    }],
    ['runStage', { jobId: 'job-001', stage: 'apply_pack' }],
  ])
  assert.equal(result.status, 200)
  assert.equal(result.body.job.id, 'job-001')
  assert.equal(result.body.pdfPath, '/generated-resumes/varian-product-lead.pdf')
})

test('career runtime lists jobs through the kernel interface', async () => {
  const jobs = [{ id: 'job-001', roleTitle: 'Product Lead' }]
  const result = await dispatchCareerOpsRequest({
    method: 'GET',
    pathname: '/jobs',
    kernel: { listJobs: async () => jobs },
  })

  assert.deepEqual(result, { status: 200, body: { jobs } })
})

test('career runtime exposes recent Agent Runs', async () => {
  const runs = [{ id: 'run-001', jobId: 'job-001', status: 'complete', events: [] }]
  const result = await dispatchCareerOpsRequest({
    method: 'GET',
    pathname: '/runs',
    kernel: { listRuns: async () => runs },
  })

  assert.deepEqual(result, { status: 200, body: { runs } })
})

function middleware(options = {}) {
  let handler
  careerOpsRuntimePlugin(options).configureServer({ middlewares: { use(prefix, callback) {
    assert.equal(prefix, '/api/career')
    handler = callback
  } } })
  return async ({ url = '/resume-sync/preview', method = 'POST', headers = {}, remoteAddress = '127.0.0.1', chunks = ['{}'] } = {}) => {
    const request = Readable.from(chunks)
    request.url = url
    request.method = method
    request.socket = { remoteAddress }
    request.headers = { host: 'localhost:3000', origin: 'http://localhost:3000', 'content-type': 'application/json', ...headers }
    const response = { headers: {}, setHeader(key, value) { this.headers[key] = value }, end(value) { this.raw = value } }
    await handler(request, response)
    return { ...response, body: response.headers['Content-Type']?.startsWith('application/json') ? JSON.parse(response.raw) : undefined }
  }
}

test('sync dispatcher delegates exact payload without requiring a career kernel', async () => {
  for (const [method, action] of [['GET', 'status'], ['POST', 'preview'], ['POST', 'publish']]) {
    const payload = { document: { id: 'doc' }, target: { repository: 'owner/repo' }, confirmationToken: 'token' }
    const response = await dispatchCareerOpsRequest({ method, pathname: `/resume-sync/${action}`, payload, resumeSync: { async [action](input) { assert.deepEqual(input, payload); return { action } } } })
    assert.deepEqual(response, { status: 200, body: { action } })
  }
})

test('sync middleware never initializes career storage', async () => {
  const run = middleware({ kernel: { initialize() { throw new Error('Must not initialize') } }, resumeSync: { preview: async () => ({ confirmationToken: 'preview-token' }), status: async () => ({ authenticated: true }) } })
  assert.equal((await run()).body.confirmationToken, 'preview-token')
  const status = await run({ method: 'GET', url: '/resume-sync/status', headers: { origin: undefined } })
  assert.equal(status.body.authenticated, true)
  assert.equal(status.headers['Cache-Control'], 'no-store')
})

test('sync POST rejects no Origin, null Origin, DNS rebinding, cross-site and remote sockets', async () => {
  let called = false
  const run = middleware({ resumeSync: { preview: async () => { called = true; return {} } } })
  for (const options of [
    { headers: { origin: undefined } },
    { headers: { origin: 'null' } },
    { headers: { origin: 'http://evil.example', host: 'evil.example' } },
    { headers: { origin: 'https://localhost:3000' } },
    { headers: { origin: 'http://localhost:3000/path' } },
    { headers: { 'sec-fetch-site': 'cross-site' } },
    { remoteAddress: '192.168.1.2' },
  ]) assert.equal((await run(options)).statusCode, 403)
  assert.equal(called, false)
  assert.equal(isTrustedCareerRequest({ socket: { remoteAddress: '::1' }, headers: { host: '[::1]:3000', origin: 'http://[::1]:3000' } }), true)
})

test('sync middleware requires JSON, bounds streamed bytes, and sanitizes parsing failures', async () => {
  let called = false
  const run = middleware({ resumeSync: { preview: async () => { called = true; return {} } } })
  assert.equal((await run({ headers: { 'content-type': 'text/plain' } })).statusCode, 415)
  const malformed = await run({ chunks: ['{"ghp_SECRET":'] })
  assert.equal(malformed.statusCode, 400)
  assert.doesNotMatch(malformed.body.error, /ghp_SECRET/)
  const chunks = Array.from({ length: Math.floor(MAX_RESUME_SYNC_REQUEST_BYTES / 1_000_000) + 1 }, () => Buffer.alloc(1_000_000))
  assert.equal((await run({ chunks })).statusCode, 413)
  assert.equal(called, false)
})

test('sync middleware exposes only safe service errors and preserves conflict status', async () => {
  const safe = middleware({ resumeSync: { preview: async () => { throw new ResumeSyncError('Preview again.', 409) } } })
  assert.deepEqual((await safe()).body, { error: 'Preview again.' })
  assert.equal((await safe()).statusCode, 409)
  const unknown = middleware({ resumeSync: { preview: async () => { throw new Error('ghp_SECRET /private/credentials') } } })
  assert.doesNotMatch((await unknown()).body.error, /ghp_SECRET|credentials/)
})

test('workflow dispatch preserves the exact captured sourceDocument and requestId', async () => {
  const payload = { company: 'Example', roleTitle: 'Researcher', jdText: 'JD', sourceUrl: 'https://example.com/job', sourceDocument: { id: 'doc-a', revision: 4, resume: { general: { name: 'Candidate' } } }, requestId: '00000000-0000-4000-8000-000000000001' }
  let captured
  const kernel = {
    createJob: async (input) => { captured = input; return { id: 'job-a' } },
    runStage: async () => ({ requestId: payload.requestId, sourceDocumentId: payload.sourceDocument.id, sourceRevision: 4, resume: { general: { name: 'Candidate' } } }),
  }
  const result = await dispatchCareerOpsRequest({ method: 'POST', pathname: '/workflow', payload, kernel })
  assert.deepEqual(captured, payload)
  assert.equal(result.body.sourceRevision, 4)
  assert.equal(result.body.requestId, payload.requestId)
})

test('browser workflow rejects missing source before initializing kernel', async () => {
  const run = middleware({ kernel: { initialize() { throw new Error('Do not initialize') } } })
  const response = await run({ url: '/workflow', chunks: [JSON.stringify({ roleTitle: 'Role', jdText: 'JD' })] })
  assert.equal(response.statusCode, 400)
  assert.match(response.body.error, /Select a resume document/)
})

test('workflow accepts bounded uploaded-image snapshots larger than one MB', async () => {
  const payload = { sourceDocument: { id: 'doc', revision: 1, resume: { general: { photo: `data:image/png;base64,${'A'.repeat(2_800_000)}` } } }, requestId: '00000000-0000-4000-8000-000000000001', roleTitle: 'Role', jdText: 'JD' }
  let captured
  const kernel = {
    initialize: async () => {},
    createJob: async (input) => { captured = input; return { id: 'job' } },
    runStage: async () => ({ requestId: payload.requestId }),
  }
  const run = middleware({ kernel })
  const result = await run({ url: '/workflow', chunks: [JSON.stringify(payload)] })
  assert.equal(result.statusCode, 200)
  assert.deepEqual(captured.sourceDocument, payload.sourceDocument)
})

test('private PDF endpoint serves only bounded real PDF files inside career/output', async (t) => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'career-runtime-'))
  t.after(() => rm(rootDir, { recursive: true, force: true }))
  await mkdir(path.join(rootDir, 'career/output'), { recursive: true })
  await writeFile(path.join(rootDir, 'career/output/cv-example.pdf'), '%PDF-1.7\nexample')
  await writeFile(path.join(rootDir, 'secret.pdf'), '%PDF-1.7\nsecret')
  await symlink(path.join(rootDir, 'secret.pdf'), path.join(rootDir, 'career/output/link.pdf'))
  await writeFile(path.join(rootDir, 'career/output/not-pdf.pdf'), 'secret')
  const run = middleware({ rootDir, kernel: { initialize() { throw new Error('Must not initialize') } } })
  const pdf = await run({ method: 'GET', url: '/pdf/cv-example.pdf' })
  assert.equal(pdf.statusCode, 200)
  assert.equal(pdf.headers['Content-Type'], 'application/pdf')
  assert.equal(pdf.headers['Cache-Control'], 'no-store')
  assert.equal(pdf.raw.toString(), '%PDF-1.7\nexample')
  for (const filename of ['link.pdf', 'not-pdf.pdf', '%2e%2e%2fsecret.pdf', 'missing.pdf']) {
    const result = await run({ method: 'GET', url: `/pdf/${filename}` })
    assert.equal(result.statusCode, 404)
    assert.doesNotMatch(result.body.error, /secret|private\//)
  }
  assert.equal((await run({ method: 'GET', url: '/pdf/cv-example.pdf', headers: { origin: 'https://evil.example' } })).statusCode, 403)
})
