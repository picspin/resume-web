import { createCareerOpsKernel } from '../career-ops/kernel.mjs'
import { runCareerWorkflow } from './career-workflow.mjs'

function isLocalRequest(request) {
  const address = request.socket?.remoteAddress || ''
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
}

export function isTrustedCareerRequest(request) {
  if (!isLocalRequest(request)) return false
  const origin = request.headers?.origin
  if (!origin) return true
  try {
    const originUrl = new URL(origin)
    return ['http:', 'https:'].includes(originUrl.protocol) && originUrl.host === request.headers?.host
  } catch {
    return false
  }
}

function isJsonRequest(request) {
  return /^application\/json(?:;|$)/i.test(String(request.headers?.['content-type'] || ''))
}

async function readJsonBody(request) {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return {}
  if (raw.length > 1_000_000) throw new Error('Career-Ops request is too large.')
  return JSON.parse(raw)
}

function sendJson(response, status, body) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(body))
}

export async function dispatchCareerOpsRequest({ method, pathname, payload = {}, kernel }) {
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

export function careerOpsRuntimePlugin({ rootDir = process.cwd(), kernel: injectedKernel } = {}) {
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
          const payload = request.method === 'POST' ? await readJsonBody(request) : {}
          const result = await dispatchCareerOpsRequest({
            method: request.method || 'GET',
            pathname,
            payload,
            kernel: await getKernel(),
          })
          sendJson(response, result.status, result.body)
        } catch (error) {
          sendJson(response, 400, { error: error instanceof Error ? error.message : 'Career-Ops request failed.' })
        }
      })
    },
  }
}
