import { execFile } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const MAX_JD_LENGTH = 100000

export function slugifyCareerJob(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildJdMarkdown({ company = '', roleTitle, jdText }) {
  const heading = [company, roleTitle].filter(Boolean).join(' - ')
  return `# ${heading}\n\n${String(jdText || '').trim()}\n`
}

function assertWorkflowInput({ company = '', roleTitle, jdText }) {
  if (!String(roleTitle || '').trim()) throw new Error('Enter a role title before running the workflow.')
  if (!String(jdText || '').trim()) throw new Error('Paste the JD text before running the workflow.')
  if (String(company).length > 160 || String(roleTitle).length > 160) throw new Error('Company and role title must be 160 characters or fewer.')
  if (String(jdText).length > MAX_JD_LENGTH) throw new Error(`JD text must be ${MAX_JD_LENGTH.toLocaleString()} characters or fewer.`)
}

function isWithinDirectory(rootDir, targetPath) {
  const root = resolve(rootDir)
  const target = resolve(targetPath)
  return target === root || target.startsWith(`${root}/`)
}

async function runNodeScript({ rootDir, script, args, exec = execFileAsync }) {
  const scriptPath = join(rootDir, script)
  const result = await exec(process.execPath, [scriptPath, ...args], {
    cwd: rootDir,
    maxBuffer: 1024 * 1024,
  })
  return String(result.stdout || '').trim()
}

export async function runCareerWorkflow({
  rootDir,
  slug: requestedSlug = '',
  company = '',
  roleTitle,
  jdText,
  exec = execFileAsync,
  onStep = async () => {},
}) {
  assertWorkflowInput({ company, roleTitle, jdText })
  const slug = requestedSlug || slugifyCareerJob([company, roleTitle].filter(Boolean).join(' '))
  if (!slug) throw new Error('Could not create a safe local job identifier from the company and role title.')
  if (slug !== slugifyCareerJob(slug)) throw new Error('Career-Ops supplied an invalid Job slug.')

  const jdsDir = join(rootDir, 'career', 'jds')
  const jdFile = join(jdsDir, `${slug}.md`)
  if (!isWithinDirectory(jdsDir, jdFile)) throw new Error('Invalid JD destination.')

  const steps = []
  await mkdir(dirname(jdFile), { recursive: true })
  await writeFile(jdFile, buildJdMarkdown({ company, roleTitle, jdText }), 'utf8')
  const intakeStep = { key: 'intake', label: 'JD intake', status: 'complete', detail: `Saved career/jds/${slug}.md` }
  steps.push(intakeStep)
  await onStep(intakeStep)

  await runNodeScript({
    rootDir,
    script: 'scripts/resume-ops/adapt-resume.mjs',
    args: ['--jd', `career/jds/${slug}.md`, '--slug', slug],
    exec,
  })
  const adaptStep = { key: 'adapt', label: 'Resume adapt', status: 'complete', detail: `Generated career/versions/${slug}` }
  steps.push(adaptStep)
  await onStep(adaptStep)

  await runNodeScript({
    rootDir,
    script: 'scripts/resume-ops/render-pdf.mjs',
    args: ['--slug', slug],
    exec,
  })
  const pdfStep = { key: 'pdf', label: 'PDF render', status: 'complete', detail: 'Created a tailored PDF artifact' }
  steps.push(pdfStep)
  await onStep(pdfStep)

  await runNodeScript({ rootDir, script: 'scripts/resume-ops/generate-manifest.mjs', args: ['--local-only'], exec })
  const manifestStep = { key: 'manifest', label: 'Manifest refresh', status: 'complete', detail: 'Refreshed local career versions' }
  steps.push(manifestStep)
  await onStep(manifestStep)

  const metadataPath = join(rootDir, 'career', 'versions', slug, 'metadata.json')
  const metadata = JSON.parse(await readFile(metadataPath, 'utf8'))
  return {
    slug,
    jdPath: `career/jds/${slug}.md`,
    pdfPath: metadata?.pdf?.publicPath || '',
    steps,
  }
}

function isLocalRequest(request) {
  const address = request.socket?.remoteAddress || ''
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
}

async function readJsonBody(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > MAX_JD_LENGTH + 4096) throw new Error('Request body is too large.')
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(payload))
}

export function careerWorkflowPlugin({ rootDir = process.cwd() } = {}) {
  return {
    name: 'local-career-workflow',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/career/workflow', async (request, response, next) => {
        if (request.method !== 'POST') return next()
        if (!isLocalRequest(request)) return sendJson(response, 403, { error: 'This local workflow only accepts loopback requests.' })

        try {
          const payload = await readJsonBody(request)
          const result = await runCareerWorkflow({
            rootDir,
            company: payload.company,
            roleTitle: payload.roleTitle,
            jdText: payload.jdText,
          })
          sendJson(response, 200, result)
        } catch (error) {
          sendJson(response, 400, { error: error instanceof Error ? error.message : 'Local workflow failed.' })
        }
      })
    },
  }
}
