import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { request as httpRequest } from 'node:http'
import { mkdir, mkdtemp, writeFile, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createPrivateServer } from '../server.mjs'
import { chromium } from 'playwright'

test('private server protects UI, API, PDF and manifest with owner authentication and fixed origin', async (t) => {
  const rootDir = await mkdtemp(join(tmpdir(), 'private-career-server-'))
  const distDir = join(rootDir, 'dist-private')
  await mkdir(join(distDir, 'assets'), { recursive: true })
  await writeFile(join(distDir, 'index.html'), '<h1>Private workspace</h1>')
  await writeFile(join(rootDir, 'secret.txt'), 'private secret')
  await symlink(join(rootDir, 'secret.txt'), join(distDir, 'assets', 'secret.txt'))
  const password = randomBytes(32).toString('hex')
  // Port zero is selected by the OS; configured public origin is independent of the bind port.
  const origin = 'http://localhost:39999'
  const server = await createPrivateServer({ rootDir, distDir, origin, username: 'owner', password, kernel: {
    initialize: async () => {}, listJobs: async () => [{ id: 'job-1', hasPdf: true }],
  } })
  await new Promise((done) => server.listen(0, '127.0.0.1', done))
  t.after(async () => { await new Promise((done) => server.close(done)); await rm(rootDir, { recursive: true, force: true }) })
  const target = `http://127.0.0.1:${server.address().port}`
  const headers = { Host: 'localhost:39999', Authorization: `Basic ${Buffer.from(`owner:${password}`).toString('base64')}` }
  // node:http preserves an explicit Host header for proxy-origin boundary tests.
  const fetch = (url, options = {}) => new Promise((done, reject) => {
    const request = httpRequest(url, options, (response) => {
      let body = ''
      response.setEncoding('utf8')
      response.on('data', (chunk) => { body += chunk })
      response.on('end', () => done({ status: response.statusCode, text: async () => body,
        json: async () => JSON.parse(body), headers: { get: (name) => response.headers[name] } }))
    })
    request.on('error', reject)
    request.end()
  })
  for (const path of ['/', '/career', '/api/career/jobs', '/api/career/pdf/resume.pdf', '/src/data/career-versions.local.json']) {
    assert.equal((await fetch(target + path, { headers: { Host: headers.Host } })).status, 401)
  }
  assert.match(await (await fetch(target + '/career', { headers })).text(), /Private workspace/)
  assert.deepEqual(await (await fetch(target + '/api/career/jobs', { headers })).json(), { jobs: [{ id: 'job-1', hasPdf: true }] })
  assert.deepEqual(await (await fetch(target + '/src/data/career-versions.local.json', { headers })).json(), [])
  assert.equal((await fetch(target + '/api/career/jobs', { headers: { ...headers, Origin: 'https://evil.example' } })).status, 403)
  assert.equal((await fetch(target + '/api/career/workflow', { method: 'POST', headers })).status, 403)
  assert.equal((await fetch(target + '/api/career/workflow', { method: 'POST', headers: { ...headers, Origin: origin } })).status, 415)
  assert.equal((await fetch(target + '/assets/secret.txt', { headers })).status, 404)
  assert.equal((await fetch(target + '/scripts/server/server.mjs', { headers })).status, 404)
  assert.equal((await fetch(target + '/', { headers: { ...headers, Host: 'evil.example' } })).status, 403)
  assert.equal((await fetch(target + '/', { headers })).headers.get('cache-control'), 'no-store')
})

test('private server fails closed without strong credentials or HTTPS origin', async () => {
  await assert.rejects(createPrivateServer({ origin: 'https://app.example', username: 'owner', password: 'short' }), /random password/)
  await assert.rejects(createPrivateServer({ origin: 'http://app.example', username: 'owner', password: 'x'.repeat(32) }), /HTTPS origin/)
})

test('private production browser exposes resume editing and the Career Console', { skip: process.env.RUN_PRIVATE_UI_TEST !== '1', timeout: 45000 }, async (t) => {
  const rootDir = await mkdtemp(join(tmpdir(), 'private-career-ui-'))
  const password = randomBytes(32).toString('hex')
  const origin = 'http://127.0.0.1:5392'
  const server = await createPrivateServer({ rootDir, distDir: join(process.cwd(), 'dist-private'), origin, username: 'owner', password,
    kernel: { initialize: async () => {}, listJobs: async () => [], listRuns: async () => [] } })
  await new Promise((done, reject) => { server.once('error', reject); server.listen(5392, '127.0.0.1', done) })
  t.after(async () => { await new Promise((done) => server.close(done)); await rm(rootDir, { recursive: true, force: true }) })
  const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL } : {})
  t.after(() => browser.close())
  const context = await browser.newContext({ httpCredentials: { username: 'owner', password }, viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(origin)
  await page.getByRole('checkbox', { name: /Edit mode/i }).waitFor()
  await page.getByRole('link', { name: /Career/ }).waitFor()
  await page.screenshot({ path: join(tmpdir(), 'resume-private-production.png'), fullPage: true })
  await page.goto(`${origin}/career`)
  await page.getByRole('button', { name: 'New Job', exact: true }).waitFor()
  await page.getByText('JD Workflow', { exact: true }).waitFor()
  await page.waitForFunction(() => document.querySelector('select[aria-label="Source resume"]')?.options.length > 1)
  assert.equal(await page.getByText('Page not found', { exact: true }).count(), 0)
  await page.screenshot({ path: join(tmpdir(), 'career-private-production.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
  assert.deepEqual(errors, [])
})
