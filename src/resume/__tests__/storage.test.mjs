import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { clone, createDocument, sanitizeResume, SECTION_ORDER } from '../documents.js'
import { createResumeStorage, RESUME_LIBRARY_STORAGE_KEY } from '../storage.js'

function fixture() {
  const data = new Map()
  const backend = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  }
  return { data, backend, storage: createResumeStorage({ storage: backend }) }
}

// Compare every actual fixture field, allowing additional editor defaults.
function contains(actual, expected, path = 'resume') {
  if (expected && typeof expected === 'object') {
    if (Array.isArray(expected)) assert.equal(actual.length, expected.length, path)
    for (const [key, value] of Object.entries(expected)) contains(actual[key], value, `${path}.${key}`)
  } else assert.equal(actual, expected, path)
}

for (const language of ['en', 'zh']) {
  test(`all actual ${language} sample fields survive save, version, restore and import`, async () => {
    const sample = JSON.parse(readFileSync(new URL(`../../data/resume-${language}.json`, import.meta.url), 'utf8'))
    const { storage } = fixture()
    const document = createDocument({ mode: 'sample', language })
    assert.equal(document instanceof Promise, false)
    contains(document.resume, sample)
    const saved = await storage.saveDocument(document, { expectedRevision: 0 })
    contains(saved.resume, sample)
    contains((await storage.loadLibrary()).documents.find((item) => item.id === saved.id).resume, sample)
    const version = await storage.saveVersion(saved, 'Original')
    contains(version.document.resume, sample)
    contains((await storage.restoreVersion(version.id)).resume, sample)
    contains((await storage.importOptimizedResume({ sourceDocument: saved, resume: sample, requestId: 'sample' })).resume, sample)
  })
}

test('blank has no personal content or media, even when given a sample source', () => {
  const blank = createDocument({ sourceDocument: createDocument({ mode: 'sample' }) })
  assert.deepEqual(blank.source, { kind: 'blank' })
  assert.ok(Object.values(blank.resume.general).every((value) => value === ''))
  assert.equal(blank.resume.banner, '')
  assert.equal(blank.resume.summary, '')
  assert.deepEqual(blank.resume.sectionTitles, {})
  for (const section of SECTION_ORDER.filter((key) => key !== 'summary')) assert.deepEqual(blank.resume[section], [])
})

test('initial sample appears once and deleting the final document keeps the library empty', async () => {
  const { storage, backend } = fixture()
  const first = await storage.loadLibrary()
  assert.equal(first.documents.length, 1)
  assert.deepEqual(await storage.loadLibrary(), first)
  await storage.deleteDocument(first.activeDocumentId)
  assert.deepEqual(await createResumeStorage({ storage: backend }).loadLibrary(), { documents: [], activeDocumentId: null, versions: [] })
})

test('duplicate edits and returned objects are isolated; all editor state persists', async () => {
  const { storage } = fixture()
  const original = (await storage.loadLibrary()).documents[0]
  const before = clone(original)
  const duplicate = createDocument({ mode: 'duplicate', sourceDocument: original })
  duplicate.resume.general = { ...duplicate.resume.general, name: 'Someone else', headline: 'Designer', location: 'Remote', photo: 'data:image/png;base64,abc' }
  duplicate.resume.banner = '/custom-banner.png'
  duplicate.resume.work[0].details.push('New detail')
  duplicate.resume.projects[0].image = '/custom-project.png'
  duplicate.resume.sectionTitles.certificates = 'Reputation'
  duplicate.theme = 'nord'
  duplicate.sectionOrder.reverse()
  duplicate.hiddenSections = ['posters', 'certificates']
  assert.deepEqual(original, before)
  const saved = await storage.saveDocument(duplicate, { expectedRevision: 0 })
  const expected = clone(saved)
  saved.resume.general.name = 'Mutated return value'
  duplicate.resume.skills.push('Mutated input')
  const loaded = await storage.loadLibrary()
  assert.deepEqual(loaded.documents.find((item) => item.id === expected.id), expected)
  assert.deepEqual(loaded.documents.find((item) => item.id === original.id), before)
})

test('stale edits and versions reject with conflict without overwriting the winner', async () => {
  const { storage, backend } = fixture()
  const otherTab = createResumeStorage({ storage: backend })
  const original = (await storage.loadLibrary()).documents[0]
  const updated = await otherTab.saveDocument({ ...original, name: 'Updated' }, { expectedRevision: original.revision })
  await assert.rejects(storage.saveDocument(original, { expectedRevision: original.revision }), { code: 'conflict' })
  await assert.rejects(storage.saveVersion(original, 'Stale'), { code: 'conflict' })
  assert.deepEqual((await storage.loadLibrary()).documents[0], updated)
  await storage.deleteDocument(updated.id)
  await assert.rejects(storage.saveDocument(updated, { expectedRevision: updated.revision }), { code: 'not-found' })
})

test('versions remain immutable and restorable after source deletion', async () => {
  const { storage } = fixture()
  const source = (await storage.loadLibrary()).documents[0]
  const version = await storage.saveVersion(source, 'Baseline')
  const snapshot = clone(version)
  version.document.resume.work[0].details.length = 0
  source.resume.general.name = 'Edited later'
  await storage.saveDocument(source, { expectedRevision: source.revision })
  await storage.deleteDocument(source.id)
  const restored = await storage.restoreVersion(version.id)
  assert.notEqual(restored.id, source.id)
  assert.equal(restored.revision, 1)
  assert.deepEqual(restored.resume, snapshot.document.resume)
  assert.deepEqual((await storage.loadLibrary()).versions, [snapshot])
})

test('optimized imports are idempotent and never steal focus, including an empty library', async () => {
  const { storage } = fixture()
  const source = (await storage.loadLibrary()).documents[0]
  source.theme = 'github'
  source.hiddenSections = ['posters']
  source.sectionOrder.reverse()
  const other = await storage.saveDocument(createDocument(), { expectedRevision: 0 })
  const args = { sourceDocument: source, resume: { summary: 'Optimized', skills: [], general: { headline: 'New headline' } }, requestId: '__proto__' }
  const [imported, retry] = await Promise.all([storage.importOptimizedResume(args), storage.importOptimizedResume(args)])
  assert.deepEqual(imported, retry)
  assert.equal(imported.resume.summary, 'Optimized')
  assert.deepEqual(imported.resume.skills, [])
  assert.equal(imported.resume.general.headline, 'New headline')
  assert.equal(imported.resume.general.photo, source.resume.general.photo)
  assert.equal(imported.resume.banner, source.resume.banner)
  assert.deepEqual(imported.resume.posters, source.resume.posters)
  assert.equal(imported.theme, source.theme)
  assert.deepEqual(imported.sectionOrder, source.sectionOrder)
  assert.deepEqual(imported.hiddenSections, source.hiddenSections)
  assert.equal((await storage.loadLibrary()).activeDocumentId, other.id)
  await storage.selectDocument(source.id)
  await storage.importOptimizedResume(args)
  assert.equal((await storage.loadLibrary()).activeDocumentId, source.id)
  for (const doc of (await storage.loadLibrary()).documents) await storage.deleteDocument(doc.id)
  await assert.rejects(storage.importOptimizedResume(args), { code: 'not-found' })
  await storage.importOptimizedResume({ ...args, requestId: 'second' })
  assert.equal((await storage.loadLibrary()).activeDocumentId, null)
})

test('corrupt stored data is visible and is never silently replaced', async () => {
  const { storage, data } = fixture()
  await storage.loadLibrary()
  const valid = JSON.parse(data.get(RESUME_LIBRARY_STORAGE_KEY))
  for (const raw of ['{', 'null', JSON.stringify({ ...valid, imports: { bad: 42 } }), JSON.stringify({ ...valid, documents: [valid.documents[0], valid.documents[0]] })]) {
    data.set(RESUME_LIBRARY_STORAGE_KEY, raw)
    await assert.rejects(storage.loadLibrary(), { code: 'validation' })
    assert.equal(data.get(RESUME_LIBRARY_STORAGE_KEY), raw)
  }
})

test('unavailable and quota failures reject asynchronously without losing persisted data', async () => {
  const unavailable = createResumeStorage({ storage: null })
  const pending = unavailable.loadLibrary()
  assert.ok(pending instanceof Promise)
  await assert.rejects(pending, { code: 'unavailable' })
  const { storage, backend, data } = fixture()
  const source = (await storage.loadLibrary()).documents[0]
  const before = data.get(RESUME_LIBRARY_STORAGE_KEY)
  for (const [name, code] of [['QuotaExceededError', 'quota'], ['NS_ERROR_DOM_QUOTA_REACHED', 'quota'], ['SecurityError', 'unavailable']]) {
    backend.setItem = () => { throw Object.assign(new Error('Failed'), { name }) }
    await assert.rejects(storage.saveDocument(source, { expectedRevision: source.revision }), { code })
    await assert.rejects(storage.saveVersion(source, 'Failed'), { code })
    await assert.rejects(storage.importOptimizedResume({ sourceDocument: source, resume: {}, requestId: 'failed' }), { code })
    assert.equal(data.get(RESUME_LIBRARY_STORAGE_KEY), before)
  }
  backend.getItem = () => { throw new Error('Read failed') }
  await assert.rejects(storage.loadLibrary(), { code: 'unavailable' })
})

test('sanitization keeps supported fields and removes malformed values', () => {
  const resume = sanitizeResume({ general: { name: 123 }, skills: ['Valid', null], work: [{ details: ['Valid', {}] }], posters: [{ event: 'Conference' }] })
  assert.equal(resume.general.name, '')
  assert.deepEqual(resume.skills, ['Valid'])
  assert.deepEqual(resume.work[0].details, ['Valid'])
  assert.equal(resume.posters[0].event, 'Conference')
})
