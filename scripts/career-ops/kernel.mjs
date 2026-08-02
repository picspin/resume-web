import { randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const JOB_STAGE = 'jd_intake'
const JOB_STATUS = 'active'
const PHASE_ONE_STAGE = 'apply_pack'
const MAX_JD_LENGTH = 100000

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function assertWithinRoot(rootDir, candidate) {
  const pathFromRoot = relative(resolve(rootDir), resolve(candidate))
  if (pathFromRoot.startsWith('..') || pathFromRoot === '') {
    throw new Error('Invalid Career-Ops workspace path.')
  }
}

function normalizeJobInput(input = {}) {
  const company = String(input.company || '').trim()
  const roleTitle = String(input.roleTitle || '').trim()
  const jdText = String(input.jdText || '').trim()
  const sourceUrl = String(input.sourceUrl || '').trim()
  if (!roleTitle) throw new Error('Role title is required.')
  if (!jdText) throw new Error('JD text is required.')
  if (company.length > 160 || roleTitle.length > 160) {
    throw new Error('Company and role title must be 160 characters or fewer.')
  }
  if (jdText.length > MAX_JD_LENGTH) {
    throw new Error(`JD text must be ${MAX_JD_LENGTH.toLocaleString()} characters or fewer.`)
  }
  if (sourceUrl.length > 2048) throw new Error('Job source URL must be 2,048 characters or fewer.')

  const slug = slugify([company, roleTitle].filter(Boolean).join(' '))
  if (!slug) throw new Error('Could not create a safe job slug.')
  return { company, roleTitle, jdText, sourceUrl, slug }
}

function renderJobMarkdown(job) {
  return [
    `# ${job.roleTitle}`,
    '',
    `- Company: ${job.company || 'Not specified'}`,
    `- Source: ${job.sourceUrl || 'Manual intake'}`,
    `- Created: ${job.createdAt}`,
    '',
    '## Job Description',
    '',
    job.jdText,
    '',
  ].join('\n')
}

function mapJobRow(row) {
  return {
    id: row.id,
    slug: row.slug,
    company: row.company,
    roleTitle: row.role_title,
    jdText: row.jd_text,
    sourceUrl: row.source_url,
    stage: row.stage,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    legacySlug: row.legacy_slug || '',
  }
}

function mapRunRow(row) {
  return {
    id: row.id,
    jobId: row.job_id,
    stage: row.stage,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at || '',
    error: row.error || '',
  }
}

function mapEventRow(row) {
  return {
    id: row.id,
    jobId: row.job_id,
    runId: row.run_id || '',
    type: row.type,
    label: row.label,
    detail: row.detail,
    createdAt: row.created_at,
  }
}

function mapArtifactRow(row) {
  return {
    id: row.id,
    jobId: row.job_id,
    runId: row.run_id || '',
    kind: row.kind,
    path: row.path,
    createdAt: row.created_at,
  }
}

function mapApprovalRow(row) {
  return {
    id: row.id,
    jobId: row.job_id,
    gate: row.gate,
    decision: row.decision,
    notes: row.notes,
    createdAt: row.created_at,
  }
}

async function readOptionalFile(path, fallback = '') {
  try {
    return await readFile(path, 'utf8')
  } catch {
    return fallback
  }
}

async function importLegacyVersions({ database, rootDir, clock }) {
  const versionsDir = join(rootDir, 'career', 'versions')
  let entries = []
  try {
    entries = await readdir(versionsDir, { withFileTypes: true })
  } catch {
    return
  }

  const insert = database.prepare(`
    INSERT OR IGNORE INTO jobs (
      id, slug, company, role_title, jd_text, source_url,
      stage, status, created_at, updated_at, legacy_slug
    ) VALUES (?, ?, ?, ?, ?, '', 'apply_pack', 'generated', ?, ?, ?)
  `)

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const slug = slugify(entry.name)
    if (!slug || slug !== entry.name) continue
    try {
      const metadata = JSON.parse(await readFile(join(versionsDir, slug, 'metadata.json'), 'utf8'))
      const generatedAt = metadata.generatedAt || clock().toISOString()
      const jdText = await readOptionalFile(join(rootDir, 'career', 'jds', `${slug}.md`))
      insert.run(
        `legacy-${slug}`,
        slug,
        String(metadata.company || ''),
        String(metadata.roleLabel || slug),
        jdText,
        generatedAt,
        generatedAt,
        slug,
      )
    } catch {
      // A partial legacy version should not block the rest of the local workspace.
    }
  }
}

export function createCareerOpsKernel({
  rootDir,
  databasePath = join(rootDir, 'career', 'career-ops.db'),
  clock = () => new Date(),
  idGenerator = randomUUID,
  runIdGenerator = randomUUID,
  eventIdGenerator = randomUUID,
  artifactIdGenerator = randomUUID,
  approvalIdGenerator = randomUUID,
  workflowRunner,
} = {}) {
  if (!rootDir) throw new Error('Career-Ops rootDir is required.')
  let database

  const requireDatabase = () => {
    if (!database) throw new Error('Career-Ops Kernel must be initialized first.')
    return database
  }

  return {
    async initialize() {
      if (database) return
      assertWithinRoot(rootDir, databasePath)
      await mkdir(dirname(databasePath), { recursive: true })
      await mkdir(join(rootDir, 'career', 'jobs'), { recursive: true })
      database = new DatabaseSync(databasePath)
      database.exec(`
        PRAGMA foreign_keys = ON;
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS jobs (
          id TEXT PRIMARY KEY,
          slug TEXT NOT NULL,
          company TEXT NOT NULL DEFAULT '',
          role_title TEXT NOT NULL,
          jd_text TEXT NOT NULL,
          source_url TEXT NOT NULL DEFAULT '',
          stage TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          archived_at TEXT,
          legacy_slug TEXT UNIQUE
        );
        CREATE INDEX IF NOT EXISTS jobs_updated_at_idx ON jobs(updated_at DESC);
        CREATE TABLE IF NOT EXISTS workflow_runs (
          id TEXT PRIMARY KEY,
          job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
          stage TEXT NOT NULL,
          status TEXT NOT NULL,
          started_at TEXT NOT NULL,
          completed_at TEXT,
          error TEXT
        );
        CREATE TABLE IF NOT EXISTS agent_events (
          id TEXT PRIMARY KEY,
          job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
          run_id TEXT REFERENCES workflow_runs(id) ON DELETE CASCADE,
          type TEXT NOT NULL,
          label TEXT NOT NULL,
          detail TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS artifacts (
          id TEXT PRIMARY KEY,
          job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
          run_id TEXT REFERENCES workflow_runs(id) ON DELETE SET NULL,
          kind TEXT NOT NULL,
          path TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS approvals (
          id TEXT PRIMARY KEY,
          job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
          gate TEXT NOT NULL,
          decision TEXT NOT NULL,
          notes TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL
        );
      `)
      await importLegacyVersions({ database, rootDir, clock })
    },

    async createJob(input) {
      const values = normalizeJobInput(input)
      const database = requireDatabase()
      const baseSlug = values.slug
      let slug = baseSlug
      let suffix = 2
      while (database.prepare('SELECT 1 FROM jobs WHERE slug = ?').get(slug)) {
        slug = `${baseSlug}-${suffix}`
        suffix += 1
      }
      const now = clock().toISOString()
      const job = {
        id: idGenerator(),
        ...values,
        slug,
        stage: JOB_STAGE,
        status: JOB_STATUS,
        createdAt: now,
        updatedAt: now,
        legacySlug: '',
      }
      const workspaceDir = join(rootDir, 'career', 'jobs', job.id)
      assertWithinRoot(join(rootDir, 'career', 'jobs'), workspaceDir)
      try {
        await mkdir(workspaceDir, { recursive: false })
        await writeFile(join(workspaceDir, 'job.md'), renderJobMarkdown(job), 'utf8')
        database.prepare(`
          INSERT INTO jobs (
            id, slug, company, role_title, jd_text, source_url,
            stage, status, created_at, updated_at, legacy_slug
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
        `).run(
          job.id,
          job.slug,
          job.company,
          job.roleTitle,
          job.jdText,
          job.sourceUrl,
          job.stage,
          job.status,
          job.createdAt,
          job.updatedAt,
        )
      } catch (error) {
        await rm(workspaceDir, { recursive: true, force: true })
        throw error
      }
      return job
    },

    async listJobs() {
      const rows = requireDatabase()
        .prepare('SELECT * FROM jobs WHERE archived_at IS NULL ORDER BY updated_at DESC, id ASC')
        .all()
      return rows.map(mapJobRow)
    },

    async listRuns({ limit = 50 } = {}) {
      const database = requireDatabase()
      const safeLimit = Math.min(200, Math.max(1, Number(limit) || 50))
      const rows = database.prepare(`
        SELECT workflow_runs.*, jobs.company, jobs.role_title
        FROM workflow_runs
        JOIN jobs ON jobs.id = workflow_runs.job_id
        ORDER BY workflow_runs.started_at DESC, workflow_runs.rowid DESC
        LIMIT ?
      `).all(safeLimit)
      return rows.map((row) => ({
        ...mapRunRow(row),
        company: row.company,
        roleTitle: row.role_title,
        events: database
          .prepare('SELECT * FROM agent_events WHERE run_id = ? ORDER BY created_at ASC, rowid ASC')
          .all(row.id)
          .map(mapEventRow),
      }))
    },

    async runStage({ jobId, stage }) {
      if (typeof workflowRunner !== 'function') throw new Error('No workflow runner is configured for this Career-Ops Kernel.')
      const database = requireDatabase()
      const jobRow = database.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId)
      if (!jobRow) throw new Error(`Career-Ops job not found: ${jobId}`)
      if (stage !== PHASE_ONE_STAGE || !['jd_intake', PHASE_ONE_STAGE].includes(jobRow.stage)) {
        throw new Error(`Unsupported Career-Ops transition: ${jobRow.stage} -> ${stage}`)
      }

      const job = mapJobRow(jobRow)
      const runId = runIdGenerator()
      const startedAt = clock().toISOString()
      database.prepare(`
        INSERT INTO workflow_runs (id, job_id, stage, status, started_at)
        VALUES (?, ?, ?, 'running', ?)
      `).run(runId, jobId, stage, startedAt)
      database.prepare(`
        INSERT INTO agent_events (id, job_id, run_id, type, label, detail, created_at)
        VALUES (?, ?, ?, 'stage.started', ?, '', ?)
      `).run(eventIdGenerator(), jobId, runId, stage, startedAt)

      try {
        const recordedStepKeys = new Set()
        const recordStep = async (step) => {
          const stepKey = String(step.key || step.label || recordedStepKeys.size)
          if (recordedStepKeys.has(stepKey)) return
          recordedStepKeys.add(stepKey)
          database.prepare(`
            INSERT INTO agent_events (id, job_id, run_id, type, label, detail, created_at)
            VALUES (?, ?, ?, 'workflow.step', ?, ?, ?)
          `).run(
            eventIdGenerator(),
            jobId,
            runId,
            String(step.label || step.key || 'Workflow step'),
            String(step.detail || ''),
            clock().toISOString(),
          )
        }
        const result = await workflowRunner({ job, rootDir, onStep: recordStep })
        const completedAt = clock().toISOString()
        for (const step of result.steps || []) {
          await recordStep(step)
        }
        const artifactValues = [
          ['jd', result.jdPath],
          ['pdf', result.pdfPath],
        ].filter(([, path]) => path)
        for (const [kind, path] of artifactValues) {
          database.prepare(`
            INSERT INTO artifacts (id, job_id, run_id, kind, path, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(artifactIdGenerator(), jobId, runId, kind, path, completedAt)
        }
        database.prepare(`
          UPDATE workflow_runs SET status = 'complete', completed_at = ? WHERE id = ?
        `).run(completedAt, runId)
        database.prepare(`
          UPDATE jobs SET stage = ?, updated_at = ? WHERE id = ?
        `).run(stage, completedAt, jobId)
        database.prepare(`
          INSERT INTO agent_events (id, job_id, run_id, type, label, detail, created_at)
          VALUES (?, ?, ?, 'stage.completed', ?, '', ?)
        `).run(eventIdGenerator(), jobId, runId, stage, completedAt)
        return { ...result, jobId, runId }
      } catch (error) {
        const completedAt = clock().toISOString()
        const message = error instanceof Error ? error.message : 'Career-Ops stage failed.'
        database.prepare(`
          UPDATE workflow_runs SET status = 'failed', completed_at = ?, error = ? WHERE id = ?
        `).run(completedAt, message, runId)
        database.prepare(`
          INSERT INTO agent_events (id, job_id, run_id, type, label, detail, created_at)
          VALUES (?, ?, ?, 'stage.failed', ?, ?, ?)
        `).run(eventIdGenerator(), jobId, runId, stage, message, completedAt)
        throw error
      }
    },

    async getJobWorkspace(jobId) {
      const database = requireDatabase()
      const jobRow = database.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId)
      if (!jobRow) return null
      return {
        job: mapJobRow(jobRow),
        runs: database.prepare('SELECT * FROM workflow_runs WHERE job_id = ? ORDER BY started_at DESC, rowid DESC').all(jobId).map(mapRunRow),
        events: database.prepare('SELECT * FROM agent_events WHERE job_id = ? ORDER BY created_at ASC, rowid ASC').all(jobId).map(mapEventRow),
        artifacts: database.prepare('SELECT * FROM artifacts WHERE job_id = ? ORDER BY created_at ASC, rowid ASC').all(jobId).map(mapArtifactRow),
        approvals: database.prepare('SELECT * FROM approvals WHERE job_id = ? ORDER BY created_at ASC, rowid ASC').all(jobId).map(mapApprovalRow),
      }
    },

    async approveGate({ jobId, gate, decision, notes = '' }) {
      const database = requireDatabase()
      if (!database.prepare('SELECT id FROM jobs WHERE id = ?').get(jobId)) {
        throw new Error(`Career-Ops job not found: ${jobId}`)
      }
      const normalizedGate = String(gate || '').trim()
      const normalizedDecision = String(decision || '').trim()
      if (!normalizedGate) throw new Error('Approval gate is required.')
      if (!['approved', 'rejected', 'needs_revision'].includes(normalizedDecision)) {
        throw new Error(`Unsupported approval decision: ${normalizedDecision}`)
      }
      const approval = {
        id: approvalIdGenerator(),
        jobId,
        gate: normalizedGate,
        decision: normalizedDecision,
        notes: String(notes || '').trim(),
        createdAt: clock().toISOString(),
      }
      database.prepare(`
        INSERT INTO approvals (id, job_id, gate, decision, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(approval.id, approval.jobId, approval.gate, approval.decision, approval.notes, approval.createdAt)
      return approval
    },

    async archiveJob(jobId) {
      const database = requireDatabase()
      const now = clock().toISOString()
      const result = database.prepare(`
        UPDATE jobs SET status = 'archived', archived_at = ?, updated_at = ? WHERE id = ?
      `).run(now, now, jobId)
      if (result.changes === 0) throw new Error(`Career-Ops job not found: ${jobId}`)
      return mapJobRow(database.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId))
    },

    close() {
      database?.close()
      database = undefined
    },
  }
}
