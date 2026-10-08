import test from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'

test('JD results stay bound to frozen inputs and clear on every input edit', { timeout: 45000 }, async (t) => {
  const server = await createServer({ configFile: false, plugins: [react()], server: { host: '127.0.0.1', port: 5199, strictPort: false, open: false, watch: null, hmr: false } })
  t.after(() => server.close())
  await server.listen()
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  const channel = process.env.PLAYWRIGHT_CHROMIUM_CHANNEL
  const browser = await chromium.launch(executablePath ? { executablePath } : channel ? { channel } : {})
  t.after(() => browser.close())
  const page = await browser.newPage()
  await page.route('**/api/career/jobs', (route) => route.fulfill({ json: { jobs: [] } }))
  await page.route('**/api/career/runs', (route) => route.fulfill({ json: { runs: [] } }))
  await page.route('**/src/data/career-versions.local.json', (route) => route.fulfill({ json: [] }))
  const resume = { general: { name: 'Morgan Synthetic' }, summary: 'Railway signalling engineer.', skills: [], work: [], projects: [] }
  const document = { id: 'source-one', name: 'Railway source', revision: 1, theme: 'default', sectionOrder: [], hiddenSections: [], source: { kind: 'blank' }, resume }
  await page.addInitScript((document) => localStorage.setItem('resume.library.v1', JSON.stringify({ schemaVersion: 1, documents: [document, { ...document, id: 'source-two', name: 'Second source' }], activeDocumentId: 'source-two', versions: [], imports: {} })), document)
  let release
  let captured
  await page.route('**/api/career/workflow', async (route) => {
    captured = route.request().postDataJSON()
    await new Promise((resolve) => { release = resolve })
    await route.fulfill({ json: { requestId: captured.requestId, sourceDocumentId: captured.sourceDocument.id, sourceRevision: captured.sourceDocument.revision, resume, metadata: {}, slug: 'railway', jdPath: 'career/jds/railway.md', sourcePath: 'career/workflow-sources/railway/source.json', steps: [] } })
  })
  await page.goto(`${server.resolvedUrls.local[0]}career`)
  await page.getByLabel('Source resume').selectOption('source-one')
  await page.getByLabel('Role title', { exact: true }).fill('Railway Engineer')
  await page.getByLabel('JD text', { exact: true }).fill('Design signalling systems')
  for (const [label, value] of [['Company', 'Rail Co'], ['Role title', 'Controls Engineer'], ['Job source link', 'https://example.test/job'], ['JD text', 'Design safe controls'], ['Source resume', 'source-two']]) {
    captured = null
    await page.getByRole('button', { name: 'Run local workflow', exact: true }).click()
    await page.waitForFunction(() => document.querySelector('select[aria-label="Source resume"]').disabled)
    for (const name of ['Source resume', 'Company', 'Role title', 'Job source link', 'JD text']) assert.equal(await page.getByLabel(name, { exact: true }).isDisabled(), true)
    while (!captured) await new Promise((resolve) => setTimeout(resolve, 10))
    assert.equal(captured.sourceDocument.resume.general.name, 'Morgan Synthetic')
    release()
    await page.getByRole('button', { name: 'Open in editor' }).waitFor()
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('resume.library.v1')).activeDocumentId), 'source-two')
    if (label === 'Source resume') await page.getByLabel(label, { exact: true }).selectOption(value)
    else await page.getByLabel(label, { exact: true }).fill(value)
    assert.equal(await page.getByRole('button', { name: 'Open in editor' }).count(), 0)
    assert.equal(await page.getByRole('button', { name: 'Sync result' }).count(), 0)
    assert.equal(await page.getByText('Ready for Evidence Review and Manual Apply Pack:', { exact: false }).count(), 0)
  }
})
