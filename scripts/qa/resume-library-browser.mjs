import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import { exportResumeHtml } from '../career-ops/resume-sync.mjs'

// These broader gates are separate from the executable synthetic editor checks.
const pending = [
  'Default sample retains original layout',
  'Source snapshot invalidation while sync is open',
  'Local runtime and gh account status are visible without credentials',
  'Failed image recovery',
]
const storageKey = 'resume.library.v1'
const photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='

async function eventually(check, message) {
  let last
  for (let attempt = 0; attempt < 60; attempt++) {
    try { return await check() } catch (error) { last = error }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error(message, { cause: last })
}

const readLibrary = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey)
async function active(page) {
  const state = await readLibrary(page)
  return state.documents.find(document => document.id === state.activeDocumentId)
}
async function save(page) {
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.getByText('Saved locally', { exact: true }).waitFor()
  await eventually(async () => assert.equal(await page.getByRole('button', { name: 'Save', exact: true }).isDisabled(), true), 'Save did not settle')
}
async function editProfile(page, values) {
  await page.getByRole('checkbox', { name: 'Edit mode' }).check()
  await page.getByRole('button', { name: 'Edit name', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: 'Profile module editor' })
  for (const [field, value] of Object.entries(values)) await drawer.getByLabel(field, { exact: true }).fill(value)
  await drawer.getByRole('button', { name: 'Close module editor' }).click()
}
async function select(page, id) {
  await page.getByLabel('Active resume').selectOption(id)
  await eventually(async () => assert.equal((await active(page)).id, id), 'Document selection did not persist')
}

async function exercise(page, label, output, sync) {
  await page.getByLabel('Active resume').waitFor()
  await eventually(async () => assert.ok((await active(page))?.id), 'Initial document missing')
  const sample = await active(page)
  await page.getByRole('button', { name: 'Blank', exact: true }).click()
  await eventually(async () => assert.notEqual((await active(page)).id, sample.id), 'Blank was not created')
  const blank = await active(page)
  assert.ok(Object.values(blank.resume.general).every(value => value === ''), 'Blank inherited profile')
  assert.equal(blank.resume.banner, '')
  assert.equal(blank.resume.summary, '')
  assert.equal(await page.locator('.resume-profile img').count(), 0)
  for (const value of [sample.resume.general.name, sample.resume.general.email_work, sample.resume.general.tel].filter(Boolean)) {
    assert.equal((await page.locator('.resume-profile').innerText()).includes(value), false, 'Blank rendered sample identity')
  }
  await page.getByLabel('Document name').fill('QA Landscape')
  await editProfile(page, { name: syntheticProfile.name, headline: syntheticProfile.profession, 'email work': syntheticProfile.email, photo })
  await page.getByRole('button', { name: 'Edit module: Summary', exact: true }).click()
  await page.getByRole('dialog').getByLabel('summary', { exact: true }).fill(syntheticProfile.summary)
  await page.getByRole('button', { name: 'Close module editor' }).click()
  await page.getByLabel('Resume theme').selectOption('github')
  await page.getByRole('button', { name: 'Drag handle: Skills', exact: true }).dragTo(page.locator('[data-editable-section="education"]'))
  await save(page)
  const saved = await active(page)
  assert.equal(saved.resume.general.photo, photo)
  assert.equal(saved.resume.general.headline, syntheticProfile.profession)
  assert.ok(saved.sectionOrder.indexOf('skills') < saved.sectionOrder.indexOf('education'), 'Pointer drag did not reorder')
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByLabel('Active resume').waitFor()
  assert.deepEqual(await active(page), saved)
  assert.equal(await page.locator('.resume-profile h1').innerText(), syntheticProfile.name)
  await eventually(async () => assert.equal(await page.locator('.resume-profile img').evaluate(img => img.complete && img.naturalWidth > 0), true), 'Profile image did not render')

  await page.getByRole('button', { name: 'Duplicate resume', exact: true }).click()
  await eventually(async () => assert.notEqual((await active(page)).id, saved.id), 'Duplicate was not created')
  const duplicateId = (await active(page)).id
  await editProfile(page, { name: 'QA Isolated Copy' })
  await page.getByLabel('Resume theme').selectOption('nord')
  await save(page)
  await select(page, saved.id)
  assert.deepEqual(await active(page), saved)
  assert.equal(await page.locator('.resume-profile h1').innerText(), syntheticProfile.name)
  await select(page, duplicateId)
  assert.equal(await page.locator('.resume-profile h1').innerText(), 'QA Isolated Copy')
  await select(page, saved.id)
  await page.locator('.resume-version-menu summary').click()
  await page.getByLabel('Version label').fill('QA baseline')
  await page.getByRole('button', { name: 'Save version', exact: true }).click()
  await page.getByRole('button', { name: 'Restore QA baseline', exact: true }).waitFor()
  await editProfile(page, { name: 'QA Later Revision' })
  await save(page)
  await page.getByRole('button', { name: 'Restore QA baseline', exact: true }).click()
  await eventually(async () => assert.equal((await active(page)).source.kind, 'restored'), 'Version restore did not create a document')
  const restored = await active(page)
  assert.notEqual(restored.id, saved.id)
  assert.deepEqual(restored.resume, saved.resume)
  assert.equal((await readLibrary(page)).documents.find(document => document.id === saved.id).resume.general.name, 'QA Later Revision')

  await page.evaluate(() => { window.__qaPrint = null; window.print = () => { window.__qaPrint = { title: document.title, name: document.querySelector('.resume-profile h1')?.textContent } } })
  await page.getByRole('button', { name: 'PDF', exact: true }).click()
  const print = await page.evaluate(() => window.__qaPrint)
  assert.equal(print.name, syntheticProfile.name)
  assert.ok(print.title.includes(syntheticProfile.name))
  await page.emulateMedia({ media: 'print' })
  assert.equal(await page.locator('.resume-library').isVisible(), false)
  assert.equal(await page.locator('.resume-editor-toolbar').isVisible(), false)
  const pdfPath = path.join(output, `${label}-current-document.pdf`)
  await page.pdf({ path: pdfPath, format: 'A4', printBackground: true })
  const pdfText = execFileSync('pdftotext', [pdfPath, '-'], { encoding: 'utf8' })
  assert.ok(pdfText.includes(syntheticProfile.name))
  assert.ok(pdfText.includes(syntheticProfile.summary))
  assert.ok(!pdfText.includes('QA Isolated Copy') && !pdfText.includes(sample.resume.general.name))
  assert.ok(!pdfText.includes('Save version') && !pdfText.includes('Edit mode'))
  await page.emulateMedia({ media: 'screen' })

  await page.getByRole('button', { name: 'Sync', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'GitHub sync' })
  await dialog.getByText('GitHub connected as qa-owner', { exact: true }).waitFor()
  await dialog.getByLabel('Repository', { exact: true }).fill('qa-owner/synthetic-resume')
  assert.equal(await dialog.getByRole('button', { name: 'Publish', exact: true }).isDisabled(), true)
  await dialog.getByRole('button', { name: 'Preview changes' }).click()
  await dialog.getByRole('region', { name: 'Publish preview' }).waitFor()
  const previewFrame = dialog.locator('iframe[title="Exact resume publication preview"]')
  assert.equal(await previewFrame.isVisible(), true)
  assert.equal(await previewFrame.getAttribute('sandbox'), '')
  assert.equal(await previewFrame.getAttribute('referrerpolicy'), 'no-referrer')
  assert.equal(await previewFrame.getAttribute('srcdoc'), sync.html)
  const frame = page.frameLocator('iframe[title="Exact resume publication preview"]')
  await frame.getByRole('heading', { name: syntheticProfile.name, exact: true }).waitFor()
  assert.equal(await frame.locator('body').evaluate(() => globalThis.__qaScriptRan), undefined)
  await page.screenshot({ path: path.join(output, `${label}-sync-preview.png`), fullPage: true })
  assert.deepEqual(sync.preview.document, restored)
  assert.equal(sync.preview.target.repository, 'qa-owner/synthetic-resume')
  assert.equal(sync.preview.target.createNew, false)
  assert.ok((await dialog.getByRole('region', { name: 'Publish preview' }).innerText()).includes('resume.json'))
  await dialog.getByLabel('Branch', { exact: true }).fill('qa-review')
  assert.equal(await dialog.getByRole('button', { name: 'Publish', exact: true }).isDisabled(), true)
  assert.equal(await previewFrame.count(), 0)
  await dialog.getByLabel('New repository', { exact: true }).check()
  await dialog.getByRole('button', { name: 'Preview changes' }).click()
  await dialog.getByRole('region', { name: 'Publish preview' }).waitFor()
  assert.equal(sync.preview.target.createNew, true)
  assert.equal(sync.preview.target.branch, 'qa-review')
  assert.equal(sync.published.length, 0)
  await dialog.getByRole('button', { name: 'Publish', exact: true }).click()
  await eventually(async () => assert.equal(sync.published.length, 1), 'Mock publication was not requested')
  await dialog.getByText('Resume published to GitHub.', { exact: true }).waitFor()
  assert.deepEqual(sync.published[0].document, sync.preview.document)
  assert.deepEqual(sync.published[0].target, sync.preview.target)
  assert.equal(sync.published[0].confirmationToken, 'qa-token')
  await dialog.getByRole('button', { name: 'Preview changes' }).click()
  await dialog.getByRole('region', { name: 'Publish preview' }).waitFor()
  sync.failPublish = true
  await dialog.getByRole('button', { name: 'Publish', exact: true }).click()
  await dialog.getByRole('alert').waitFor()
  assert.equal(await dialog.getByRole('button', { name: 'Publish', exact: true }).isDisabled(), true)
  await dialog.getByRole('button', { name: 'Close GitHub sync' }).click()
  await page.screenshot({ path: path.join(output, `${label}-synthetic-resume.png`), fullPage: true })
  return ['blank privacy', 'profile/photo/summary save-reload', 'duplicate and switching isolation', 'theme and pointer-drag persistence', 'new-document version restore', 'current-document print/PDF text', 'mock target preview/invalidation/publication/error/account']
}

async function exerciseWorkflow(page, base, sync) {
  const before = await readLibrary(page)
  const source = before.documents.find(document => document.id === before.activeDocumentId)
  await page.goto(new URL('/career', base).href, { waitUntil: 'networkidle' })
  await page.getByLabel('Source resume', { exact: true }).selectOption(source.id)
  await page.getByLabel('Role title', { exact: true }).fill('Landscape Architect')
  await page.getByLabel('Company', { exact: true }).fill('QA Gardens')
  await page.getByLabel('JD text', { exact: true }).fill('Plan synthetic accessible public gardens.')
  await page.getByRole('button', { name: 'Run local workflow', exact: true }).click()
  await page.getByRole('button', { name: 'Open in editor', exact: true }).waitFor()
  assert.deepEqual(sync.workflow.sourceDocument, source)
  assert.equal(sync.workflow.jdText, 'Plan synthetic accessible public gardens.')
  const importedState = await readLibrary(page)
  assert.equal(importedState.activeDocumentId, before.activeDocumentId)
  const imported = importedState.documents.find(document => document.source.requestId === sync.workflow.requestId)
  assert.equal(imported.source.documentId, source.id)
  assert.equal(imported.resume.summary, 'QA tailored garden design evidence.')
  assert.deepEqual(importedState.documents.find(document => document.id === source.id), source)
  await page.getByLabel('JD text', { exact: true }).fill('Changed synthetic JD')
  assert.equal(await page.getByRole('button', { name: 'Open in editor', exact: true }).count(), 0)
  assert.equal(await page.getByRole('button', { name: 'Sync result', exact: true }).count(), 0)
  await page.getByRole('button', { name: 'Run local workflow', exact: true }).click()
  await page.getByRole('button', { name: 'Open in editor', exact: true }).click()
  await page.getByLabel('Active resume').waitFor()
  assert.equal((await active(page)).resume.summary, 'QA tailored garden design evidence.')
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByLabel('Active resume').waitFor()
  assert.equal((await active(page)).resume.summary, 'QA tailored garden design evidence.')
}

async function exerciseStorageErrors(page) {
  const before = await page.evaluate(key => localStorage.getItem(key), storageKey)
  await editProfile(page, { name: 'QA Unsaved After Quota' })
  await page.evaluate(key => {
    window.__qaSetItem = Storage.prototype.setItem
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('Synthetic quota', 'QuotaExceededError')
      return window.__qaSetItem.call(this, name, value)
    }
  }, storageKey)
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.getByRole('alert').filter({ hasText: 'Local storage is full.' }).waitFor()
  assert.equal(await page.evaluate(key => localStorage.getItem(key), storageKey), before)
  assert.ok((await page.locator('.resume-profile h1').innerText()).includes('QA Unsaved After Quota'))
  await page.evaluate(() => { Storage.prototype.setItem = window.__qaSetItem })
  await save(page)
  const recovered = await page.evaluate(key => localStorage.getItem(key), storageKey)
  await page.evaluate(key => localStorage.setItem(key, '{'), storageKey)
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('alert').waitFor()
  assert.equal(await page.evaluate(key => localStorage.getItem(key), storageKey), '{')
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: storageKey, value: recovered })
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByLabel('Active resume').waitFor()
  assert.equal((await active(page)).resume.general.name, 'QA Unsaved After Quota')
}

export const syntheticProfile = Object.freeze({
  name: 'QA Synthetic Architect',
  profession: 'Landscape Architect',
  email: 'resume-qa@example.invalid',
  summary: 'Synthetic landscape planning experience for isolated browser QA.',
})

async function run() {
  assert.equal(process.env.RESUME_QA_READY, '1', 'Wait for parent readiness; set RESUME_QA_READY=1 only after approval.')
  const base = new URL(process.env.RESUME_QA_URL || 'http://127.0.0.1:3000')
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'QA requires a loopback server')
  assert.equal(base.protocol, 'http:')
  const output = path.join(tmpdir(), `resume-library-qa-${Date.now()}`)
  await mkdir(output, { recursive: true })
  const report = { pending, checks: [], output }
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    for (const [label, viewport] of Object.entries({
      desktop: { width: 1440, height: 1000 },
      mobile: { width: 390, height: 844 },
    })) {
      // The app has no service worker. Playwright's blocking init script throws
      // inside the deliberately opaque publication iframe.
      const context = await browser.newContext({ viewport })
      try {
        const sync = { preview: null, published: [], failPublish: false, workflow: null }
        // No persistent profile or imported storageState: user storage is untouched.
        await context.route('**/*', async (route) => {
          const request = route.request()
          const url = new URL(request.url())
          if (['data:', 'blob:'].includes(url.protocol)) return route.continue()
          if (url.origin !== base.origin) return route.abort('blockedbyclient')
          const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
          if (url.pathname === '/src/data/career-versions.local.json') return reply([])
          if (url.pathname === '/api/career/jobs') return reply({ jobs: [] })
          if (url.pathname === '/api/career/runs') return reply({ runs: [] })
          if (url.pathname === '/api/career/workflow' && request.method() === 'POST') {
            sync.workflow = request.postDataJSON()
            const source = sync.workflow.sourceDocument
            return reply({ requestId: sync.workflow.requestId, sourceDocumentId: source.id, sourceRevision: source.revision, resume: { ...source.resume, summary: 'QA tailored garden design evidence.' }, metadata: {}, slug: 'qa-gardens', jdPath: 'career/jds/qa-gardens.md', sourcePath: 'career/workflow-sources/qa-gardens/source.json', steps: [] })
          }
          if (url.pathname === '/api/career/resume-sync/status') return reply({ authenticated: true, login: 'qa-owner' })
          if (url.pathname === '/api/career/resume-sync/preview' && request.method() === 'POST') {
            sync.preview = request.postDataJSON()
            // Inject a harmless sentinel into the real exporter HTML to prove sandbox execution is denied.
            sync.html = (await exportResumeHtml(sync.preview.document)).replace('</body>', '<script>window.__qaScriptRan=true</script></body>')
            return reply({ confirmationToken: 'qa-token', html: sync.html, target: sync.preview.target, repositoryVisibility: 'private', changedPaths: ['resume.json'], warnings: [] })
          }
          if (url.pathname === '/api/career/resume-sync/publish' && request.method() === 'POST') {
            sync.published.push(request.postDataJSON())
            return sync.failPublish ? reply({ error: 'Synthetic conflict' }, 409) : reply({ published: true })
          }
          if (!['GET', 'HEAD'].includes(request.method()) || url.pathname.startsWith('/api/')) {
            return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'QA endpoint requires an explicit synthetic fixture' }) })
          }
          return route.continue()
        })
        const page = await context.newPage()
        page.setDefaultTimeout(10000)
        const errors = []
        const pageErrors = []
        // Record counts only: console messages and request URLs may contain private data.
        page.on('pageerror', error => { errors.push('pageerror'); pageErrors.push(error.message) })
        page.on('console', (message) => { if (message.type() === 'error') errors.push('console.error') })
        const response = await page.goto(base.href, { waitUntil: 'networkidle' })
        assert.ok(response?.ok(), `${label}: page response failed`)
        const passed = await exercise(page, label, output, sync)
        const dimensions = await page.evaluate(() => ({
          width: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          hasContent: document.body.innerText.trim().length > 0,
        }))
        assert.ok(dimensions.hasContent, `${label}: blank page`)
        assert.ok(dimensions.scrollWidth <= dimensions.width + 1, `${label}: horizontal overflow`)
        await exerciseWorkflow(page, base, sync)
        passed.push('synthetic source/JD import and stale-result invalidation')
        await exerciseStorageErrors(page)
        passed.push('quota failure preserves edits; corrupt storage remains intact; recovery reload')
        assert.equal(pageErrors.length, 0, `Uncaught browser error: ${pageErrors.join('; ')}`)
        report.checks.push({ label, dimensions, passed, errorCount: errors.length })
      } catch (error) {
        report.checks.push({ label, failed: error.message })
        const page = context.pages()[0]
        if (page) await page.screenshot({ path: path.join(output, `${label}-failure.png`), fullPage: true }).catch(() => {})
        throw error
      } finally {
        await context.close()
      }
    }
  } finally {
    await browser.close()
    await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2))
  }
  console.log(`Synthetic E2E passed: ${output}; ${pending.length} broader gates remain pending.`)
}

await run()
