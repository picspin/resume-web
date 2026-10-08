import { createCareerOpsKernel } from '../career-ops/kernel.mjs'
import { createResumeSyncService, MAX_RESUME_SYNC_REQUEST_BYTES, ResumeSyncError } from '../career-ops/resume-sync.mjs'
import { runCareerWorkflow } from './career-workflow.mjs'

function isLocalRequest(request) {
  const address = request.socket?.remoteAddress || ''
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
}

export function isTrustedCareerRequest(request) {
  if (!isLocalRequest(request)) return false
  const host = request.headers?.host
  if (typeof host !== 'string' || !/^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/.test(host)) return false
  const origin = request.headers?.origin
  if (!origin) return true
  try {
    const originUrl = new URL(origin)
    return originUrl.protocol === (request.socket?.encrypted ? 'https:' : 'http:') && originUrl.host === host && originUrl.origin === origin
  } catch {
    return false
  }
}

function isJsonRequest(request) {
  return /^application\/json(?:;|$)/i.test(String(request.headers?.['content-type'] || ''))
}

async function readJsonBody(request, limit = 1_000_000) {
  const chunks = []
  let bytes = 0
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    bytes += buffer.length
    if (bytes > limit) throw new ResumeSyncError('Career-Ops request is too large.', 413)
    chunks.push(buffer)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return {}
  return JSON.parse(raw)
}

function sendJson(response, status, body) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.end(JSON.stringify(body))
}

async function sendLocalPdf(rootDir, filename, response) {
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,180}\.pdf$/.test(filename) || filename.includes('..')) {
    return sendJson(response, 404, { error: 'PDF not found.' })
  }
  let file
  try {
    const directory = path.join(await realpath(rootDir), 'career/output')
    if (await realpath(directory) !== directory) throw new Error('Invalid output directory.')
    const destination = path.join(directory, filename)
    if (await realpath(destination) !== destination) throw new Error('Invalid output file.')
    file = await open(destination, constants.O_RDONLY | constants.O_NOFOLLOW)
    const stat = await file.stat()
    if (!stat.isFile() || stat.size > 25_000_000) throw new Error('Invalid PDF size.')
    const bytes = Buffer.alloc(stat.size)
    let offset = 0
    while (offset < bytes.length) {
      const { bytesRead } = await file.read(bytes, offset, bytes.length - offset, offset)
      if (!bytesRead) throw new Error('Incomplete PDF.')
      offset += bytesRead
    }
    if (bytes.subarray(0, 5).toString() !== '%PDF-') throw new Error('Invalid PDF.')
    response.statusCode = 200
    response.setHeader('Content-Type', 'application/pdf')
    response.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.end(bytes)
  } catch {
    sendJson(response, 404, { error: 'PDF not found.' })
  } finally { await file?.close() }
}

export async function dispatchCareerOpsRequest({ method, pathname, payload = {}, kernel, resumeSync }) {
  const syncMethod = method === 'GET' && pathname === '/resume-sync/status' ? 'status'
    : method === 'POST' && pathname === '/resume-sync/preview' ? 'preview'
      : method === 'POST' && pathname === '/resume-sync/publish' ? 'publish' : null
  if (syncMethod) {
    if (!resumeSync) throw new ResumeSyncError('Resume sync is unavailable.', 503)
    return { status: 200, body: await resumeSync[syncMethod](payload) }
  }
  if (method === 'POST' && pathname === '/workflow') {
    const job = await kernel.createJob(payload)
    const result = await kernel.runStage({ jobId: job.id, stage: 'apply_pack' })
    return { status: 200, body: { ...result, job } }
  }
  if (method === 'GET' && pathname === '/jobs') {
    return { status: 200, body: { jobs: await kernel.listJobs() } }
  }
  if (method === 'GET' && pathname === '/runs') {
    return { status: 200, body: { runs: await kernel.listRuns() } }
  }
  if (method === 'GET' && pathname === '/opportunities') {
    return { status: 200, body: { opportunities: [] } }
  }
  const workspaceMatch = method === 'GET' && pathname.match(/^\/jobs\/([^/]+)$/)
  if (workspaceMatch) {
    const workspace = await kernel.getJobWorkspace(decodeURIComponent(workspaceMatch[1]))
    return workspace
      ? { status: 200, body: workspace }
      : { status: 404, body: { error: 'Career-Ops job not found.' } }
  }
  return { status: 404, body: { error: 'Career-Ops route not found.' } }
}

export function careerOpsRuntimePlugin({ rootDir = process.cwd(), kernel: injectedKernel, resumeSync: injectedResumeSync } = {}) {
  const resumeSync = injectedResumeSync || createResumeSyncService({ rootDir })
  let kernelPromise
  const getKernel = async () => {
    if (!kernelPromise) {
      const kernel = injectedKernel || createCareerOpsKernel({
        rootDir,
        workflowRunner: ({ job, onStep }) => runCareerWorkflow({
          rootDir,
          slug: job.slug,
          company: job.company,
          roleTitle: job.roleTitle,
          jdText: job.jdText,
          sourceUrl: job.sourceUrl,
          sourceDocument: job.sourceDocument,
          requestId: job.requestId,
          onStep,
        }),
      })
      kernelPromise = kernel.initialize().then(() => kernel)
    }
    return kernelPromise
  }

  return {
    name: 'local-career-ops-runtime',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/career', async (request, response) => {
        if (!isTrustedCareerRequest(request)) {
          return sendJson(response, 403, { error: 'Career-Ops only accepts same-origin loopback requests.' })
        }
        if (request.method === 'POST' && !isJsonRequest(request)) {
          return sendJson(response, 415, { error: 'Career-Ops POST requests require application/json.' })
        }
        try {
          const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname
          const syncRoute = pathname.startsWith('/resume-sync/')
          if (request.method === 'POST' && (syncRoute || pathname === '/workflow') && !request.headers?.origin) {
            return sendJson(response, 403, { error: 'A same-origin browser request is required.' })
          }
          if (request.headers?.['sec-fetch-site'] === 'cross-site') {
            return sendJson(response, 403, { error: 'Cross-site requests are not permitted.' })
          }
          if (request.method === 'GET' && pathname.startsWith('/pdf/')) {
            return await sendLocalPdf(rootDir, pathname.slice('/pdf/'.length), response)
          }
          const payload = request.method === 'POST' ? await readJsonBody(request, syncRoute || pathname === '/workflow' ? MAX_RESUME_SYNC_REQUEST_BYTES : undefined) : {}
          if (request.method === 'POST' && pathname === '/workflow' && (!payload?.sourceDocument || typeof payload.requestId !== 'string' || !payload.requestId)) {
            return sendJson(response, 400, { error: 'Select a resume document and provide a request ID.' })
          }
          const result = await dispatchCareerOpsRequest({
            method: request.method || 'GET',
            pathname,
            payload,
            kernel: syncRoute ? undefined : await getKernel(),
            resumeSync,
          })
          sendJson(response, result.status, result.body)
        } catch (error) {
          sendJson(response, error instanceof ResumeSyncError ? error.statusCode : 400, { error: error instanceof ResumeSyncError ? error.message : 'Career-Ops request failed. Check the input and local service configuration.' })
        }
      })
    },
  }
}
import { open, realpath } from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
