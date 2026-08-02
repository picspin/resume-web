import assert from 'node:assert/strict'
import test from 'node:test'

import { dispatchCareerOpsRequest, isTrustedCareerRequest } from '../career-runtime.mjs'

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
