import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { buildJdMarkdown, runCareerWorkflow, slugifyCareerJob } from '../career-workflow.mjs'

test('slugifies a company and title into a safe local job identifier', () => {
  assert.equal(slugifyCareerJob('Siemens Healthineers / Application Solution Owner'), 'siemens-healthineers-application-solution-owner')
})

test('writes the JD before launching the fixed local resume scripts', async () => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'career-workflow-'))
  await fs.mkdir(path.join(rootDir, 'career', 'versions', 'varian-medical-ai-lead'), { recursive: true })
  await fs.writeFile(
    path.join(rootDir, 'career', 'versions', 'varian-medical-ai-lead', 'metadata.json'),
    JSON.stringify({ pdf: { publicPath: '/generated-resumes/cv-varian-medical-ai-lead.pdf' } }),
  )
  const calls = []
  const exec = async (_command, args) => {
    calls.push(args)
    return { stdout: 'ok' }
  }

  const result = await runCareerWorkflow({
    rootDir,
    company: 'Varian',
    roleTitle: 'Medical AI Lead',
    jdText: 'Lead clinical adoption and evidence generation.',
    exec,
  })

  const jdPath = path.join(rootDir, 'career', 'jds', 'varian-medical-ai-lead.md')
  assert.match(await fs.readFile(jdPath, 'utf8'), /Lead clinical adoption/)
  assert.equal(result.slug, 'varian-medical-ai-lead')
  assert.equal(result.pdfPath, '/generated-resumes/cv-varian-medical-ai-lead.pdf')
  assert.equal(calls.length, 3)
  assert.deepEqual(calls[0].slice(-4), ['--jd', 'career/jds/varian-medical-ai-lead.md', '--slug', 'varian-medical-ai-lead'])
  assert.match(calls[2][0], /scripts\/resume-ops\/generate-manifest\.mjs$/)
  assert.equal(calls[2][1], '--local-only')
  assert.equal(buildJdMarkdown({ company: 'Varian', roleTitle: 'Medical AI Lead', jdText: 'JD' }), '# Varian - Medical AI Lead\n\nJD\n')
})

test('uses the Job aggregate slug and reports completed steps immediately', async () => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'career-workflow-job-'))
  const slug = 'varian-medical-ai-lead-2'
  await fs.mkdir(path.join(rootDir, 'career', 'versions', slug), { recursive: true })
  await fs.writeFile(
    path.join(rootDir, 'career', 'versions', slug, 'metadata.json'),
    JSON.stringify({ pdf: { publicPath: `/generated-resumes/cv-${slug}.pdf` } }),
  )
  const steps = []

  const result = await runCareerWorkflow({
    rootDir,
    slug,
    company: 'Varian',
    roleTitle: 'Medical AI Lead',
    jdText: 'Updated role evidence.',
    exec: async () => ({ stdout: 'ok' }),
    onStep: async (step) => steps.push(step.key),
  })

  assert.equal(result.slug, slug)
  assert.deepEqual(steps, ['intake', 'adapt', 'pdf', 'manifest'])
})
