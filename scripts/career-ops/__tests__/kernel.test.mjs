import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { DatabaseSync } from 'node:sqlite'

import { createCareerOpsKernel } from '../kernel.mjs'

test('kernel persists source identity and revision independently for same-title jobs', async (t) => {
  const rootDir = await mkdtemp(join(tmpdir(), 'career-source-kernel-'))
  let received
  const kernel = createCareerOpsKernel({ rootDir, workflowRunner: async ({ job }) => { received = job; return { steps: [], requestId: job.requestId } } })
  t.after(() => kernel.close())
  await kernel.initialize()
  const sourceDocument = { id: 'synthetic', revision: 3, resume: { general: { name: 'Railway Engineer' }, work: [] } }
  const requestId = '00000000-0000-4000-8000-000000000002'
  const first = await kernel.createJob({ roleTitle: 'Engineer', jdText: 'Controls', sourceDocument, requestId })
  sourceDocument.resume.general.name = 'Changed after intake'
  const second = await kernel.createJob({ roleTitle: 'Engineer', jdText: 'Controls', sourceDocument, requestId })
  assert.notEqual(first.slug, second.slug)
  await kernel.runStage({ jobId: first.id, stage: 'apply_pack' })
  assert.equal(received.sourceDocument.resume.general.name, 'Railway Engineer')
  assert.equal(received.sourceDocument.revision, 3)
  assert.equal(received.requestId, requestId)
  await assert.rejects(kernel.createJob({ roleTitle: 'Engineer', jdText: 'Controls', sourceDocument: null }), /Invalid source/)
})

test('createJob persists a local job workspace through the kernel interface', async (t) => {
  const rootDir = await mkdtemp(join(tmpdir(), 'career-ops-kernel-'))
  const kernel = createCareerOpsKernel({
    rootDir,
    clock: () => new Date('2026-08-03T09:30:00.000Z'),
    idGenerator: () => 'job-001',
  })
  t.after(() => kernel.close())

  await kernel.initialize()
  const created = await kernel.createJob({
    company: 'Varian',
    roleTitle: 'Digital Health Product Lead',
    jdText: 'Lead medical digital products and cross-functional evidence generation.',
    sourceUrl: 'https://jobs.example.test/varian-product-lead',
  })

  assert.equal(created.id, 'job-001')
  assert.equal(created.slug, 'varian-digital-health-product-lead')
  assert.equal(created.stage, 'jd_intake')
  assert.equal(created.status, 'active')

  const jobs = await kernel.listJobs()
  assert.deepEqual(jobs.map(({ id, company, roleTitle, stage, status }) => ({ id, company, roleTitle, stage, status })), [
    {
      id: 'job-001',
      company: 'Varian',
      roleTitle: 'Digital Health Product Lead',
      stage: 'jd_intake',
      status: 'active',
    },
  ])

  const jobMarkdown = await readFile(join(rootDir, 'career', 'jobs', 'job-001', 'job.md'), 'utf8')
  assert.match(jobMarkdown, /^# Digital Health Product Lead/m)
  assert.match(jobMarkdown, /Company: Varian/)
  assert.match(jobMarkdown, /Lead medical digital products/)
})

test('createJob gives repeated roles independent artifact slugs', async (t) => {
  const rootDir = await mkdtemp(join(tmpdir(), 'career-ops-duplicates-'))
  const ids = ['job-101', 'job-102']
  const kernel = createCareerOpsKernel({ rootDir, idGenerator: () => ids.shift() })
  t.after(() => kernel.close())
  await kernel.initialize()

  const first = await kernel.createJob({ company: 'Varian', roleTitle: 'Product Lead', jdText: 'First JD.' })
  const second = await kernel.createJob({ company: 'Varian', roleTitle: 'Product Lead', jdText: 'Updated JD.' })

  assert.equal(first.slug, 'varian-product-lead')
  assert.equal(second.slug, 'varian-product-lead-2')
})

test('concurrent same-title jobs keep separate JD files and artifact slugs', async (t) => {
  const rootDir = await mkdtemp(join(tmpdir(), 'career-ops-concurrent-'))
  const kernel = createCareerOpsKernel({ rootDir, workflowRunner: async ({ job }) => {
    await mkdir(join(rootDir, 'career', 'jds'), { recursive: true })
    await writeFile(join(rootDir, 'career', 'jds', `${job.slug}.md`), job.jdText)
    return { jdPath: `career/jds/${job.slug}.md` }
  } })
  t.after(() => kernel.close())
  await kernel.initialize()
  const jobs = await Promise.all(['First JD.', 'Second JD.'].map((jdText) =>
    kernel.createJob({ company: 'Varian', roleTitle: 'Product Lead', jdText })))
  assert.notEqual(jobs[0].slug, jobs[1].slug)
  await Promise.all(jobs.map((job) => kernel.runStage({ jobId: job.id, stage: 'apply_pack' })))
  for (const job of jobs) {
    assert.equal(await readFile(join(rootDir, 'career', 'jds', `${job.slug}.md`), 'utf8'), job.jdText)
  }
})

test('listJobs exposes the latest PDF artifact without a version manifest', async (t) => {
  const rootDir = await mkdtemp(join(tmpdir(), 'career-ops-pdf-list-'))
  let revision = 0
  const kernel = createCareerOpsKernel({ rootDir, workflowRunner: async () => ({
    pdfPath: `/api/career/pdf/revision-${++revision}.pdf`,
  }) })
  t.after(() => kernel.close())
  await kernel.initialize()
  const job = await kernel.createJob({ roleTitle: 'Clinical AI Lead', jdText: 'Clinical workflow.' })
  assert.equal((await kernel.listJobs())[0].hasPdf, false)
  await kernel.runStage({ jobId: job.id, stage: 'apply_pack' })
  await kernel.runStage({ jobId: job.id, stage: 'apply_pack' })
  const jobs = await kernel.listJobs()
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].hasPdf, true)
  assert.equal(jobs[0].pdfPath, '/api/career/pdf/revision-2.pdf')
})

test('slug uniqueness migrates existing databases without deleting colliding history', async (t) => {
  const rootDir = await mkdtemp(join(tmpdir(), 'career-ops-slug-migration-'))
  const first = createCareerOpsKernel({ rootDir })
  await first.initialize()
  await first.createJob({ roleTitle: 'Engineer', jdText: 'Original evidence.' })
  first.close()
  const oldDatabase = new DatabaseSync(join(rootDir, 'career', 'career-ops.db'))
  oldDatabase.exec('DROP INDEX jobs_slug_unique')
  oldDatabase.close()
  const migrated = createCareerOpsKernel({ rootDir })
  await migrated.initialize()
  const next = await migrated.createJob({ roleTitle: 'Engineer', jdText: 'New evidence.' })
  assert.equal(next.slug, 'engineer-2')
  migrated.close()
  const corrupt = new DatabaseSync(join(rootDir, 'career', 'career-ops.db'))
  corrupt.exec("DROP INDEX jobs_slug_unique; UPDATE jobs SET slug = 'engineer'")
  corrupt.close()
  const refused = createCareerOpsKernel({ rootDir })
  t.after(() => refused.close())
  await assert.rejects(refused.initialize(), /Back up the workspace/)
  const preserved = new DatabaseSync(join(rootDir, 'career', 'career-ops.db'))
  assert.equal(preserved.prepare('SELECT COUNT(*) AS count FROM jobs').get().count, 2)
  preserved.close()
})

test('workspace failures release the reserved slug without deleting existing files', async (t) => {
  const rootDir = await mkdtemp(join(tmpdir(), 'career-ops-reservation-'))
  const kernel = createCareerOpsKernel({ rootDir, idGenerator: () => 'existing' })
  t.after(() => kernel.close())
  await kernel.initialize()
  const directory = join(rootDir, 'career', 'jobs', 'existing')
  await mkdir(directory)
  await writeFile(join(directory, 'job.md'), 'Keep this file.')
  await assert.rejects(kernel.createJob({ roleTitle: 'Engineer', jdText: 'New job.' }), /EEXIST/)
  assert.equal(await readFile(join(directory, 'job.md'), 'utf8'), 'Keep this file.')
  assert.deepEqual(await kernel.listJobs(), [])
})

test('initialize indexes legacy career versions once without moving their files', async (t) => {
  const rootDir = await mkdtemp(join(tmpdir(), 'career-ops-legacy-'))
  const legacyDir = join(rootDir, 'career', 'versions', 'sample-medical-role')
  await mkdir(legacyDir, { recursive: true })
  await mkdir(join(rootDir, 'career', 'jds'), { recursive: true })
  await writeFile(join(rootDir, 'career', 'jds', 'sample-medical-role.md'), '# Sample JD\n\nMedical device portfolio leadership.', 'utf8')
  await writeFile(join(legacyDir, 'metadata.json'), JSON.stringify({
    roleLabel: 'Medical Device Portfolio Lead',
    generatedAt: '2026-07-01T08:00:00.000Z',
    archetypes: [{ label: 'Medical Device Portfolio / Product Strategy' }],
    pdf: { publicPath: '/generated-resumes/sample-medical-role.pdf' },
  }), 'utf8')

  const kernel = createCareerOpsKernel({ rootDir })
  t.after(() => kernel.close())
  await kernel.initialize()
  await kernel.initialize()

  const jobs = await kernel.listJobs()
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].hasPdf, undefined)
  assert.deepEqual(
    {
      id: jobs[0].id,
      slug: jobs[0].slug,
      roleTitle: jobs[0].roleTitle,
      stage: jobs[0].stage,
      status: jobs[0].status,
      legacySlug: jobs[0].legacySlug,
    },
    {
      id: 'legacy-sample-medical-role',
      slug: 'sample-medical-role',
      roleTitle: 'Medical Device Portfolio Lead',
      stage: 'apply_pack',
      status: 'generated',
      legacySlug: 'sample-medical-role',
    },
  )
  assert.match(await readFile(join(legacyDir, 'metadata.json'), 'utf8'), /Medical Device Portfolio Lead/)
})

test('runStage records workflow events and artifacts in the job workspace', async (t) => {
  const rootDir = await mkdtemp(join(tmpdir(), 'career-ops-stage-'))
  const workflowRunner = async ({ job, onStep }) => {
    await onStep({ key: 'intake', label: 'JD intake', status: 'complete', detail: 'Saved JD' })
    await onStep({ key: 'adapt', label: 'Resume adapt', status: 'complete', detail: 'Generated resume' })
    return {
      slug: job.slug,
      jdPath: `career/jds/${job.slug}.md`,
      pdfPath: `/generated-resumes/${job.slug}.pdf`,
    }
  }
  const kernel = createCareerOpsKernel({
    rootDir,
    clock: () => new Date('2026-08-03T10:00:00.000Z'),
    idGenerator: () => 'job-002',
    runIdGenerator: () => 'run-001',
    eventIdGenerator: (() => {
      let next = 0
      return () => `event-${++next}`
    })(),
    artifactIdGenerator: (() => {
      let next = 0
      return () => `artifact-${++next}`
    })(),
    workflowRunner,
  })
  t.after(() => kernel.close())
  await kernel.initialize()
  const job = await kernel.createJob({ roleTitle: 'Clinical AI Lead', jdText: 'Build clinical AI workflows.' })

  await kernel.runStage({ jobId: job.id, stage: 'apply_pack' })
  const workspace = await kernel.getJobWorkspace(job.id)

  assert.equal(workspace.job.stage, 'apply_pack')
  assert.equal(workspace.runs[0].status, 'complete')
  assert.deepEqual(workspace.events.map(({ type, label }) => ({ type, label })), [
    { type: 'stage.started', label: 'apply_pack' },
    { type: 'workflow.step', label: 'JD intake' },
    { type: 'workflow.step', label: 'Resume adapt' },
    { type: 'stage.completed', label: 'apply_pack' },
  ])
  assert.deepEqual(workspace.artifacts.map(({ kind, path }) => ({ kind, path })), [
    { kind: 'jd', path: 'career/jds/clinical-ai-lead.md' },
    { kind: 'pdf', path: '/generated-resumes/clinical-ai-lead.pdf' },
  ])
  const runs = await kernel.listRuns()
  assert.equal(runs[0].jobId, job.id)
  assert.equal(runs[0].roleTitle, 'Clinical AI Lead')
  assert.equal(runs[0].status, 'complete')
  assert.deepEqual(runs[0].events.map((event) => event.type), [
    'stage.started',
    'workflow.step',
    'workflow.step',
    'stage.completed',
  ])
})

test('runStage keeps completed step events when a later workflow step fails', async (t) => {
  const rootDir = await mkdtemp(join(tmpdir(), 'career-ops-partial-run-'))
  const kernel = createCareerOpsKernel({
    rootDir,
    idGenerator: () => 'job-partial',
    runIdGenerator: () => 'run-partial',
    eventIdGenerator: (() => {
      let next = 0
      return () => `event-partial-${++next}`
    })(),
    workflowRunner: async ({ onStep }) => {
      await onStep({ key: 'intake', label: 'JD intake', detail: 'Saved JD' })
      throw new Error('PDF render failed.')
    },
  })
  t.after(() => kernel.close())
  await kernel.initialize()
  const job = await kernel.createJob({ roleTitle: 'Clinical Product Lead', jdText: 'Build clinical products.' })

  await assert.rejects(kernel.runStage({ jobId: job.id, stage: 'apply_pack' }), /PDF render failed/)
  const workspace = await kernel.getJobWorkspace(job.id)

  assert.equal(workspace.runs[0].status, 'failed')
  assert.deepEqual(workspace.events.map(({ type, label }) => ({ type, label })), [
    { type: 'stage.started', label: 'apply_pack' },
    { type: 'workflow.step', label: 'JD intake' },
    { type: 'stage.failed', label: 'apply_pack' },
  ])
})

test('runStage rejects unsupported Phase 1 transitions', async (t) => {
  const rootDir = await mkdtemp(join(tmpdir(), 'career-ops-transition-'))
  const kernel = createCareerOpsKernel({
    rootDir,
    idGenerator: () => 'job-transition',
    workflowRunner: async () => ({}),
  })
  t.after(() => kernel.close())
  await kernel.initialize()
  const job = await kernel.createJob({ roleTitle: 'Medical AI Lead', jdText: 'Lead medical AI.' })

  await assert.rejects(
    kernel.runStage({ jobId: job.id, stage: 'application' }),
    /Unsupported Career-Ops transition: jd_intake -> application/,
  )
})

test('approveGate and archiveJob preserve an auditable workspace', async (t) => {
  const rootDir = await mkdtemp(join(tmpdir(), 'career-ops-approval-'))
  const kernel = createCareerOpsKernel({
    rootDir,
    clock: () => new Date('2026-08-03T11:00:00.000Z'),
    idGenerator: () => 'job-003',
    approvalIdGenerator: () => 'approval-001',
  })
  t.after(() => kernel.close())
  await kernel.initialize()
  const job = await kernel.createJob({ roleTitle: 'Medical Affairs AI Lead', jdText: 'Lead evidence-backed AI programs.' })

  await kernel.approveGate({ jobId: job.id, gate: 'evidence_review', decision: 'approved', notes: 'Claims verified.' })
  await kernel.archiveJob(job.id)

  assert.deepEqual(await kernel.listJobs(), [])
  const workspace = await kernel.getJobWorkspace(job.id)
  assert.equal(workspace.job.status, 'archived')
  assert.deepEqual(workspace.approvals.map(({ id, gate, decision, notes }) => ({ id, gate, decision, notes })), [
    { id: 'approval-001', gate: 'evidence_review', decision: 'approved', notes: 'Claims verified.' },
  ])
})
