import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { snapshotSourceDocument } from '../lib/workflow-source.mjs'
import { runCareerWorkflow } from '../../dev/career-workflow.mjs'
import { buildManifests } from '../lib/manifest.mjs'

const exec = promisify(execFile)
const source = { id: 'synthetic-engineer', revision: 7, resume: { general: { name: 'Synthetic Engineer' }, summary: 'Builds railway control systems.', work: [], projects: [], skills: [] } }
const requestId = '00000000-0000-4000-8000-000000000001'

test('failed downstream run retries exact snapshot but rejects changed source without overwriting files', async (t) => {
  const rootDir = await mkdtemp(join(tmpdir(), 'source-retry-'))
  t.after(() => rm(rootDir, { recursive: true, force: true }))
  let fail = true
  let calls = 0
  const runner = async () => {
    calls += 1
    if (fail) throw new Error('Synthetic downstream failure')
    const directory = join(rootDir, 'career/versions/railway')
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, 'metadata.json'), JSON.stringify({ localOnly: true }))
    await writeFile(join(directory, 'resume.json'), JSON.stringify(source.resume))
    return { stdout: '' }
  }
  const input = { rootDir, slug: 'railway', roleTitle: 'Engineer', jdText: 'Controls', sourceDocument: source, requestId, exec: runner }
  await assert.rejects(runCareerWorkflow(input), /Synthetic downstream failure/)
  const snapshotPath = join(rootDir, `career/workflow-sources/railway/${requestId}.json`)
  const original = await readFile(snapshotPath, 'utf8')
  fail = false
  const result = await runCareerWorkflow(input)
  assert.equal(result.requestId, requestId)
  assert.deepEqual(result.resume, source.resume)
  assert.equal(calls, 4)
  const jdPath = join(rootDir, result.jdPath)
  const originalJd = await readFile(jdPath, 'utf8')
  await assert.rejects(runCareerWorkflow({ ...input, jdText: 'Changed JD', sourceDocument: { ...source, revision: source.revision + 1 } }), /snapshot conflict/)
  assert.equal(calls, 4)
  assert.equal(await readFile(snapshotPath, 'utf8'), original)
  assert.equal(await readFile(jdPath, 'utf8'), originalJd)
})

test('source validation rejects explicit invalid inputs and snapshots nested identity', () => {
  for (const invalid of [null, {}, { ...source, revision: -1 }, { ...source, resume: [] }, ...[{ work: [null] }, { skills: [{}] }, { work: [{ details: [42] }] }, { projects: [{ title: {} }] }].map((fields) => ({ ...source, resume: { ...source.resume, ...fields } }))]) assert.throws(() => snapshotSourceDocument(invalid), /Invalid source/)
  const copy = snapshotSourceDocument(source)
  copy.resume.general.name = 'Other'
  assert.equal(source.resume.general.name, 'Synthetic Engineer')
})

test('source-backed and local-only versions never enter frontend manifests', () => {
  const records = [
    { slug: 'private', metadata: { localOnly: true }, resume: source.resume },
    { slug: 'source', metadata: { sourceDocumentId: source.id }, resume: source.resume },
    { slug: 'public', metadata: {}, resume: { general: { name: 'Public fixture' } } },
  ]
  const manifests = buildManifests(records)
  assert.deepEqual(manifests.publicVersions.map((entry) => entry.slug), ['public'])
  assert.deepEqual(manifests.careerVersions.map((entry) => entry.slug), ['public'])
  assert.doesNotMatch(JSON.stringify(manifests), /Synthetic Engineer/)
})

test('explicit CLI source preserves a different profession and rejects missing source', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'source-cli-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await writeFile(join(root, 'source.json'), JSON.stringify(source))
  await writeFile(join(root, 'jd.md'), '# Railway engineer\nBuild reliable control systems.')
  const script = resolve('scripts/resume-ops/adapt-resume.mjs')
  await exec(process.execPath, [script, '--jd', 'jd.md', '--slug', 'railway', '--source', 'source.json'], { cwd: root })
  const result = JSON.parse(await readFile(join(root, 'career/versions/railway/resume.json')))
  assert.equal(result.general.name, source.resume.general.name)
  assert.equal(result.summary, source.resume.summary)
  assert.doesNotMatch(result.summary, /medical imaging|Xiaolei/)
  await assert.rejects(exec(process.execPath, [script, '--jd', 'jd.md', '--source', 'missing.json'], { cwd: root }), /Invalid source document/)
})

test('workflow passes immutable job-scoped source and returns import identity', async (t) => {
  const rootDir = await mkdtemp(join(tmpdir(), 'source-workflow-'))
  t.after(() => rm(rootDir, { recursive: true, force: true }))
  const calls = []
  const runner = async (_command, args) => {
    calls.push(args)
    const directory = join(rootDir, 'career/versions/railway')
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, 'metadata.json'), JSON.stringify({ localOnly: true }))
    await writeFile(join(directory, 'resume.json'), JSON.stringify(source.resume))
    return { stdout: '' }
  }
  const result = await runCareerWorkflow({ rootDir, slug: 'railway', roleTitle: 'Engineer', jdText: 'Controls', sourceDocument: source, requestId, exec: runner })
  assert.equal(result.requestId, requestId)
  assert.equal(result.sourceDocumentId, source.id)
  assert.equal(result.sourceRevision, 7)
  assert.deepEqual(result.resume, source.resume)
  assert.equal(result.sourcePath, `career/workflow-sources/railway/${requestId}.json`)
  assert.deepEqual(JSON.parse(await readFile(join(rootDir, result.sourcePath))), source)
  assert.deepEqual(calls[0].slice(-2), ['--source', result.sourcePath])
  assert.equal(calls[1].at(-1), '--local-only')
  await assert.rejects(runCareerWorkflow({ rootDir, roleTitle: 'Engineer', jdText: 'Controls', sourceDocument: null, exec: runner }), /Invalid source/)
  assert.equal(calls.length, 3)
})
