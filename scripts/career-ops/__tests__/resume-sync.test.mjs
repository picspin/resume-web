import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { createResumeSyncService, exportResumeHtml, validateResumeSyncRequest } from '../resume-sync.mjs'
import { createDocument } from '../../../src/resume/documents.js'

const HEAD = 'a'.repeat(40)
const ROOT = 'b'.repeat(40)
const TREE = 'c'.repeat(40)
const COMMIT = 'd'.repeat(40)
const OTHER = 'e'.repeat(40)
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6X8AAAAASUVORK5CYII=', 'base64')
const DATA = `data:image/png;base64,${PNG.toString('base64')}`
const request = () => ({ document: { id: 'candidate-1', name: 'Candidate resume', theme: 'default', sectionOrder: ['work', 'skills'], hiddenSections: [], resume: { general: { name: 'Candidate', headline: 'Researcher', location: 'Example city' }, summary: 'Selected summary', work: [{ title: 'Research lead', details: ['One result'] }], skills: ['Analysis'] } }, target: { repository: 'picspin/meinCV', branch: 'main', createNew: false, visibility: 'private' } })

function fakeGitHub(options = {}) {
  const calls = []
  const state = { exists: true, head: HEAD, private: false, rootEntries: [{ path: 'README.md', mode: '100644', type: 'blob', sha: OTHER }], entries: null, ...options }
  const result = (value) => ({ stdout: JSON.stringify(value) })
  const http = (status) => { throw Object.assign(new Error('DO NOT EXPOSE ghp_secret or /private/local/path'), { httpStatus: status }) }
  const execGh = async (args, { input } = {}) => {
    assert.equal(args[0], 'api')
    assert.deepEqual(args.slice(1, 3), ['--hostname', 'github.com'])
    const method = args[4]
    const endpoint = args[5]
    const body = input ? JSON.parse(input) : undefined
    calls.push({ method, endpoint, body })
    if (state.fail) http(state.fail)
    if (endpoint === 'user') return result({ login: state.login || 'picspin', token: 'NEVER_RETURN_THIS' })
    if (endpoint.startsWith('users/')) return result({ type: state.ownerType || 'User' })
    if (method === 'POST' && (endpoint === 'user/repos' || endpoint.startsWith('orgs/'))) {
      state.exists = true
      state.private = body.private
      return result({ private: body.private, full_name: state.createdName || `picspin/${body.name}`, default_branch: state.defaultBranch || 'main' })
    }
    if (/^repos\/[^/]+\/[^/]+$/.test(endpoint)) {
      if (!state.exists) http(404)
      return result({ private: state.private, permissions: { push: true } })
    }
    if (endpoint.includes('/git/ref/heads/')) return result({ ref: `refs/heads/${endpoint.split('/git/ref/heads/')[1]}`, object: { type: 'commit', sha: state.head } })
    if (method === 'GET' && endpoint.includes('/git/commits/')) return result({ tree: { sha: ROOT } })
    if (method === 'GET' && endpoint.includes('/git/trees/')) {
      const id = endpoint.split('/').at(-1)
      const entries = id === ROOT ? [...state.rootEntries, ...(state.entries ? [{ path: 'resumes', type: 'tree', sha: '1'.repeat(40) }] : [])]
        : id === '1'.repeat(40) ? [{ path: 'candidate-1', type: 'tree', sha: '2'.repeat(40) }] : state.entries
      return result({ tree: entries, truncated: Boolean(state.truncated) })
    }
    if (method === 'POST' && endpoint.endsWith('/git/trees')) return result({ sha: TREE })
    if (method === 'POST' && endpoint.endsWith('/git/commits')) {
      if (state.race) state.head = OTHER
      return result({ sha: COMMIT })
    }
    if (method === 'POST' && endpoint.endsWith('/git/refs')) return result({ ref: body.ref })
    if (method === 'PATCH') {
      if (state.rejectPatch) http(422)
      assert.equal(body.force, false)
      state.head = body.sha
      return result({ object: { sha: body.sha } })
    }
    throw new Error(`Unexpected fake call: ${method} ${endpoint}`)
  }
  return { state, calls, execGh, writes: () => calls.filter((call) => call.method !== 'GET') }
}

test('status is credential-free, read-only, and sanitizes authentication failures', async () => {
  const fake = fakeGitHub()
  const service = createResumeSyncService({ execGh: fake.execGh })
  const status = await service.status()
  assert.equal(status.authenticated, true)
  assert.equal(status.login, 'picspin')
  assert.doesNotMatch(JSON.stringify(status), /NEVER_RETURN/)
  assert.equal(fake.writes().length, 0)
  fake.state.fail = 401
  assert.equal((await service.status()).authenticated, false)
  assert.doesNotMatch(JSON.stringify(await service.status()), /ghp_|private\/local/)
})

test('preview is read-only and includes exact destination, actual visibility, html and create-only root entry', async () => {
  const fake = fakeGitHub()
  const preview = await createResumeSyncService({ execGh: fake.execGh }).preview(request())
  assert.equal(preview.visibility, 'public')
  assert.equal(preview.repositoryVisibility, 'public')
  assert.deepEqual(preview.target, request().target)
  assert.match(preview.confirmationToken, /^[a-f0-9]{64}$/)
  assert.match(preview.fingerprint, /^[a-f0-9]{64}$/)
  assert.deepEqual(preview.changedPaths, ['resumes/candidate-1/resume.json', 'resumes/candidate-1/index.html', 'resumes/candidate-1/metadata.json', 'index.html'])
  assert.match(preview.html, /Selected summary/)
  assert.equal(fake.writes().length, 0)
})

test('publish preserves base tree and unrelated files and atomically updates branch without force', async () => {
  const fake = fakeGitHub()
  const service = createResumeSyncService({ execGh: fake.execGh })
  const payload = request()
  const preview = await service.preview(payload)
  const published = await service.publish({ ...payload, confirmationToken: preview.confirmationToken })
  const writes = fake.writes()
  assert.deepEqual(writes.map((call) => call.method), ['POST', 'POST', 'PATCH'])
  assert.equal(writes[0].body.base_tree, ROOT)
  assert.deepEqual(writes[0].body.tree.map((entry) => entry.path), preview.changedPaths)
  assert.ok(writes[0].body.tree.every((entry) => entry.mode === '100644' && entry.type === 'blob'))
  assert.deepEqual(writes[1].body.parents, [HEAD])
  assert.equal(writes[2].body.force, false)
  assert.equal(published.commitSha, COMMIT)
  assert.match(published.url, /^https:\/\/github.com\/picspin\/meinCV\/tree\//)
  await assert.rejects(service.publish({ ...payload, confirmationToken: preview.confirmationToken }), /missing or expired/)
})

test('existing root entry is never changed', async () => {
  const fake = fakeGitHub({ rootEntries: [{ path: 'index.html', type: 'blob', mode: '100644', sha: OTHER }] })
  const service = createResumeSyncService({ execGh: fake.execGh })
  const payload = request()
  const preview = await service.preview(payload)
  assert.ok(!preview.changedPaths.includes('index.html'))
  await service.publish({ ...payload, confirmationToken: preview.confirmationToken })
  assert.ok(fake.writes()[0].body.tree.every((entry) => entry.path.startsWith('resumes/candidate-1/')))
})

test('JSON export excludes hidden entries and internal truth/evaluation notes everywhere', async () => {
  const fake = fakeGitHub()
  const service = createResumeSyncService({ execGh: fake.execGh })
  const payload = request()
  payload.document.hiddenSections = ['work']
  payload.document.sectionTitles = { work: 'PRIVATE_NOTES top title', skills: 'Visible skills' }
  payload.document.resume.sectionTitles = { work: 'PRIVATE_NOTES resume title', projects: 'Visible projects' }
  payload.document.truth = 'PRIVATE_NOTES'
  payload.document.resume.evaluation = 'PRIVATE_NOTES'
  payload.document.resume.general.internal = 'PRIVATE_NOTES'
  payload.document.resume.projects = [{ title: 'Public project', description: 'Result', truth: 'PRIVATE_NOTES' }]
  const preview = await service.preview(payload)
  assert.doesNotMatch(preview.html, /Research lead|PRIVATE_NOTES/)
  await service.publish({ ...payload, confirmationToken: preview.confirmationToken })
  const files = fake.writes()[0].body.tree
  assert.doesNotMatch(JSON.stringify(files), /PRIVATE_NOTES|Research lead/)
  assert.match(files.find((file) => file.path.endsWith('/resume.json')).content, /Public project/)
  const exported = JSON.parse(files.find((file) => file.path.endsWith('/resume.json')).content)
  assert.deepEqual(exported.sectionTitles, { skills: 'Visible skills' })
  assert.deepEqual(exported.resume.sectionTitles, { projects: 'Visible projects' })
  assert.equal(Object.hasOwn(JSON.parse(files.find((file) => file.path.endsWith('/metadata.json')).content), 'fingerprint'), false)
})

test('hidden-only edits invalidate authorization without changing published content', async () => {
  const fake = fakeGitHub()
  const service = createResumeSyncService({ execGh: fake.execGh })
  const payload = request()
  payload.document.hiddenSections = ['work', 'summary']
  payload.document.sectionTitles = { work: 'Secret employer' }
  payload.document.resume.sectionTitles = { summary: 'Secret summary title' }
  const first = await service.preview(payload)
  await service.publish({ ...payload, confirmationToken: first.confirmationToken })
  const original = fake.writes().find((call) => call.endpoint.endsWith('/git/trees')).body.tree
  const stale = await service.preview(payload)
  payload.document.resume.work[0].title = 'Another secret'
  payload.document.resume.summary = 'Another hidden summary'
  payload.document.sectionTitles.work = 'Another hidden title'
  payload.document.resume.sectionTitles.summary = 'Another hidden summary title'
  await assert.rejects(service.publish({ ...payload, confirmationToken: stale.confirmationToken }), /changed/)
  const next = await service.preview(payload)
  assert.notEqual(next.fingerprint, stale.fingerprint)
  assert.equal(next.html, first.html)
  await service.publish({ ...payload, confirmationToken: next.confirmationToken })
  assert.deepEqual(fake.writes().filter((call) => call.endpoint.endsWith('/git/trees')).at(-1).body.tree, original)
})

test('changed document, target, revision and privacy selection cannot reuse confirmation', async () => {
  for (const change of [
    (value) => { value.document.name = 'Changed' },
    (value) => { value.document.revision = 2 },
    (value) => { value.document.hiddenSections = ['work'] },
    (value) => { value.target.repository = 'picspin/other' },
    (value) => { value.target.branch = 'other' },
  ]) {
    const fake = fakeGitHub()
    const service = createResumeSyncService({ execGh: fake.execGh })
    const payload = request()
    const preview = await service.preview(payload)
    change(payload)
    await assert.rejects(service.publish({ ...payload, confirmationToken: preview.confirmationToken }), /changed/)
    assert.equal(fake.writes().length, 0)
  }
})

test('expired and evicted tokens fail without writes', async () => {
  let clock = 0
  const fake = fakeGitHub()
  const service = createResumeSyncService({ execGh: fake.execGh, now: () => clock })
  const first = await service.preview(request())
  clock = 600_001
  await assert.rejects(service.publish({ ...request(), confirmationToken: first.confirmationToken }), /expired/)
  const second = await service.preview(request())
  for (let index = 0; index < 4; index++) await service.preview(request())
  await assert.rejects(service.publish({ ...request(), confirmationToken: second.confirmationToken }), /expired/)
  assert.equal(fake.writes().length, 0)
})

test('remote head or visibility changes invalidate preview before writes', async () => {
  for (const change of [(state) => { state.head = OTHER }, (state) => { state.private = true }]) {
    const fake = fakeGitHub()
    const service = createResumeSyncService({ execGh: fake.execGh })
    const preview = await service.preview(request())
    change(fake.state)
    await assert.rejects(service.publish({ ...request(), confirmationToken: preview.confirmationToken }), /changed/)
    assert.equal(fake.writes().length, 0)
  }
})

test('concurrent remote change during commit creation never updates branch', async () => {
  const fake = fakeGitHub({ race: true })
  const service = createResumeSyncService({ execGh: fake.execGh })
  const preview = await service.preview(request())
  await assert.rejects(service.publish({ ...request(), confirmationToken: preview.confirmationToken }), /changed during publishing/)
  assert.ok(fake.writes().every((call) => call.method !== 'PATCH'))
})

test('simultaneous token reuse permits only one publish', async () => {
  const fake = fakeGitHub()
  const service = createResumeSyncService({ execGh: fake.execGh })
  const preview = await service.preview(request())
  const payload = { ...request(), confirmationToken: preview.confirmationToken }
  const results = await Promise.allSettled([service.publish(payload), service.publish(payload)])
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1)
  assert.equal(fake.writes().filter((call) => call.method === 'PATCH').length, 1)
})

test('new private repository is created only after preview, including nondefault branch', async () => {
  const fake = fakeGitHub({ exists: false, defaultBranch: 'master' })
  const service = createResumeSyncService({ execGh: fake.execGh })
  const payload = request()
  payload.target = { ...payload.target, repository: 'picspin/new-resume', createNew: true }
  const preview = await service.preview(payload)
  assert.equal(fake.writes().length, 0)
  assert.equal(preview.repositoryVisibility, 'private')
  await service.publish({ ...payload, confirmationToken: preview.confirmationToken })
  assert.deepEqual(fake.writes()[0], { method: 'POST', endpoint: 'user/repos', body: { name: 'new-resume', private: true, auto_init: true } })
  assert.equal(fake.writes()[1].body.ref, 'refs/heads/main')
})

test('create fails closed when repo appears after preview or unrelated account is targeted', async () => {
  const fake = fakeGitHub({ exists: false })
  const service = createResumeSyncService({ execGh: fake.execGh })
  const payload = request()
  payload.target.createNew = true
  const preview = await service.preview(payload)
  fake.state.exists = true
  await assert.rejects(service.publish({ ...payload, confirmationToken: preview.confirmationToken }), /already exists/)
  assert.equal(fake.writes().length, 0)
  fake.state.exists = false
  payload.target.repository = 'somebody/new-resume'
  await assert.rejects(service.preview(payload), /authenticated account/)
})

test('GitHub errors are sanitized and non-fast-forward rejection stays nonforced', async () => {
  const fake = fakeGitHub({ rejectPatch: true })
  const service = createResumeSyncService({ execGh: fake.execGh })
  const preview = await service.preview(request())
  await assert.rejects(service.publish({ ...request(), confirmationToken: preview.confirmationToken }), (error) => error.statusCode === 409 && !/ghp_|private\/local/.test(error.message))
  assert.equal(fake.writes().at(-1).body.force, false)
})

test('unchanged export avoids commits and preserves existing root page', async () => {
  const fake = fakeGitHub()
  const service = createResumeSyncService({ execGh: fake.execGh })
  let preview = await service.preview(request())
  await service.publish({ ...request(), confirmationToken: preview.confirmationToken })
  const files = fake.writes()[0].body.tree
  const entry = (file) => ({ path: file.path.split('/').at(-1), mode: '100644', type: 'blob', sha: createHash('sha1').update(`blob ${Buffer.byteLength(file.content)}\0`).update(file.content).digest('hex') })
  fake.state.rootEntries = [entry(files.find((file) => file.path === 'index.html'))]
  fake.state.entries = files.filter((file) => file.path.startsWith('resumes/')).map(entry)
  preview = await service.preview(request())
  assert.deepEqual(preview.changedPaths, [])
  const before = fake.writes().length
  const published = await service.publish({ ...request(), confirmationToken: preview.confirmationToken })
  assert.equal(published.commitSha, COMMIT)
  assert.equal(fake.writes().length, before)
})

test('input constraints reject traversal, git ref syntax, unsupported themes and invalid visibility', () => {
  for (const [field, value] of [['repository', '../evil'], ['repository', 'picspin/repo?x'], ['branch', 'main/../evil'], ['branch', 'refs/heads/x.lock'], ['branch', 'a//b'], ['branch', '-main'], ['visibility', 'unknown']]) {
    const payload = request()
    payload.target[field] = value
    assert.throws(() => validateResumeSyncRequest(payload))
  }
  for (const id of ['../x', 'a/b', '', '-bad', 'x'.repeat(81)]) {
    const payload = request()
    payload.document.id = id
    assert.throws(() => validateResumeSyncRequest(payload), /ID/)
  }
  const payload = request()
  payload.document.theme = '" onload="alert(1)'
  assert.throws(() => validateResumeSyncRequest(payload), /theme/)
  assert.throws(() => validateResumeSyncRequest({ document: request().document }), /explicit repository/)
  payload.document = request().document
  payload.document.source = { kind: 'personal-sample', sampleId: 'xiaolei' }
  assert.equal(validateResumeSyncRequest({ document: payload.document }).target.repository, 'picspin/meinCV')
})

test('explicit public repository creation is previewed and published with matching visibility', async () => {
  const fake = fakeGitHub({ exists: false })
  const service = createResumeSyncService({ execGh: fake.execGh })
  const payload = request()
  payload.target = { ...payload.target, createNew: true, visibility: 'public' }
  const preview = await service.preview(payload)
  assert.equal(preview.repositoryVisibility, 'public')
  assert.match(preview.warnings.join(' '), /publicly readable/)
  await service.publish({ ...payload, confirmationToken: preview.confirmationToken })
  assert.equal(fake.writes()[0].body.private, false)
})

test('library sample schema exports with summary ordering, renamed sections and portable full-size images', async () => {
  const document = createDocument({ mode: 'sample' })
  document.resume.sectionTitles = { summary: 'Profile', work: 'Employment', general: 'Contact' }
  document.sectionOrder = ['work', ...document.sectionOrder.filter((key) => key !== 'work')]
  const fake = fakeGitHub()
  const service = createResumeSyncService({ execGh: fake.execGh })
  const payload = { document, target: request().target }
  const preview = await service.preview(payload)
  assert.ok(preview.html.indexOf('id="work"') < preview.html.indexOf('id="summary"'))
  assert.match(preview.html, />Employment<|>Profile</)
  assert.ok(Buffer.byteLength(preview.html) > 8_000_000, 'real sample includes large project images')
  await service.publish({ ...payload, confirmationToken: preview.confirmationToken })
  const files = fake.writes().find((call) => call.endpoint.endsWith('/git/trees')).body.tree
  const exported = JSON.parse(files.find((file) => file.path.endsWith('/resume.json')).content)
  assert.ok(exported.resume.general.photo.startsWith('data:image/'))
  assert.ok(exported.resume.banner.startsWith('data:image/'))
  assert.ok(exported.resume.projects.every((item) => !item.image || item.image.startsWith('data:image/')))
  assert.equal(exported.resume.sectionTitles.work, 'Employment')
})

test('hidden summary and hidden image sections are not rendered, serialized, or read', async () => {
  const payload = request()
  payload.document.sectionOrder = ['summary', 'projects', 'work']
  payload.document.hiddenSections = ['summary', 'projects']
  payload.document.resume.projects = [{ title: 'Secret project', image: '/never/read/secret.png' }]
  const fake = fakeGitHub()
  const service = createResumeSyncService({ execGh: fake.execGh })
  const preview = await service.preview(payload)
  assert.doesNotMatch(preview.html, /Selected summary|Secret project/)
  await service.publish({ ...payload, confirmationToken: preview.confirmationToken })
  assert.doesNotMatch(JSON.stringify(fake.writes()[0].body.tree), /Selected summary|Secret project|never\/read/)
})

test('truncated trees and namespace file collisions fail closed', async () => {
  for (const options of [{ truncated: true }, { rootEntries: [{ path: 'resumes', type: 'blob', sha: OTHER }] }, { entries: [{ path: 'index.html', type: 'tree', mode: '040000', sha: OTHER }] }]) {
    const fake = fakeGitHub(options)
    await assert.rejects(createResumeSyncService({ execGh: fake.execGh }).preview(request()), /tree|conflict/)
    assert.equal(fake.writes().length, 0)
  }
})

test('static export reflects section titles, order, hidden sections, theme, photo, banner and contact', async () => {
  const document = request().document
  document.theme = 'nord'
  document.sectionOrder = ['skills', 'projects', 'work']
  document.sectionTitles = { skills: 'Capabilities' }
  document.hiddenSections = ['work']
  document.resume.general.photo = DATA
  document.resume.banner = DATA
  document.resume.projects = [{ title: 'New project', description: '<strong>Safe bold</strong><script>alert(1)</script>', image: DATA, url: 'javascript:alert(1)' }]
  const html = await exportResumeHtml(document)
  assert.match(html, /class="nord"/)
  for (const text of ['Capabilities', 'Researcher', 'Example city', 'New project', 'class="avatar"', 'class="banner"', '<strong>Safe bold</strong>']) assert.ok(html.includes(text), text)
  assert.ok(html.indexOf('id="skills"') < html.indexOf('id="projects"'))
  assert.doesNotMatch(html, /Research lead|<script>|href="javascript:/)
  assert.equal((html.match(/src="data:image\/png;base64,/g) || []).length, 3)
  const blank = await exportResumeHtml({ id: 'blank', name: 'Blank', resume: {} })
  assert.doesNotMatch(blank, /Xiaolei|Bayer|Avatar.jpg|banner.jpeg|<img/)
})

test('images accept bounded whitelisted raster files and reject SVG, remote URLs, traversal and symlinks', async (t) => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'resume-sync-'))
  t.after(() => rm(rootDir, { recursive: true, force: true }))
  await mkdir(path.join(rootDir, 'public/images'), { recursive: true })
  await writeFile(path.join(rootDir, 'public/images/safe.png'), PNG)
  await writeFile(path.join(rootDir, 'secret.png'), PNG)
  await symlink(path.join(rootDir, 'secret.png'), path.join(rootDir, 'public/images/link.png'))
  const document = request().document
  document.resume.general.photo = '/images/safe.png'
  assert.match(await exportResumeHtml(document, { rootDir }), /src="data:image\/png;base64,/)
  for (const image of ['/images/../secret.png', '/images/link.png', 'https://example.org/photo.png', 'http://127.0.0.1/secret', 'file:///etc/passwd', 'data:image/svg+xml;base64,PHN2Zy8+', 'data:image/png;base64,PHN2Zy8+']) {
    document.resume.general.photo = image
    await assert.rejects(exportResumeHtml(document, { rootDir }), /image|Image/)
  }
})

test('changed local image bytes invalidate reviewed snapshot', async (t) => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'resume-sync-'))
  t.after(() => rm(rootDir, { recursive: true, force: true }))
  await mkdir(path.join(rootDir, 'public/images'), { recursive: true })
  const filename = path.join(rootDir, 'public/images/photo.png')
  await writeFile(filename, PNG)
  const fake = fakeGitHub()
  const service = createResumeSyncService({ rootDir, execGh: fake.execGh })
  const payload = request()
  payload.document.resume.general.photo = '/images/photo.png'
  const preview = await service.preview(payload)
  await writeFile(filename, Buffer.concat([PNG, Buffer.from('changed')]))
  await assert.rejects(service.publish({ ...payload, confirmationToken: preview.confirmationToken }), /changed/)
  assert.equal(fake.writes().length, 0)
})
