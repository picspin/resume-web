import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPortfolioDraft } from '../portfolioDrafts.js'
import { appendUniqueSkills, buildResumePreview } from '../portfolioPreview.js'

test('buildResumePreview appends draft project and unique skills without mutating base resume', () => {
  const baseResume = {
    general: { name: 'Xiaolei Zhu' },
    skills: ['Medical AI & Digital Health: LLM/RAG workflow design.'],
    projects: [{ projectNumber: 1, title: 'Existing Project', description: 'Existing', image: '/images/projects/project-1.jpg' }],
  }
  const draft = buildPortfolioDraft({
    title: 'Radiology RAG Enablement',
    projectType: 'llm-rag',
    role: 'Solution owner',
    dateRange: '2025',
    imagePath: '/images/projects/project-24.jpg',
    rawText: 'Designed a RAG-based assistant for radiology product education.',
  })

  const preview = buildResumePreview(baseResume, draft)

  assert.equal(baseResume.projects.length, 1)
  assert.equal(preview.resume.projects.length, 2)
  assert.equal(preview.resume.projects[1].title, 'Radiology RAG Enablement')
  preview.resume.projects[1].title = 'Mutated project title'
  assert.equal(draft.webProject.title, 'Radiology RAG Enablement')
  assert.ok(preview.resume.skills.length > baseResume.skills.length)
  assert.deepEqual(preview.metadata.resumeBullets, [draft.resumeBullet])
  assert.equal(preview.metadata.reviewOnly, true)
})

test('buildResumePreview returns a safe clone when draft is empty', () => {
  const baseResume = { general: { name: 'Xiaolei Zhu' }, skills: ['A'], projects: [] }
  const preview = buildResumePreview(baseResume, null)

  assert.notEqual(preview.resume, baseResume)
  assert.deepEqual(preview.resume, baseResume)
  assert.deepEqual(preview.metadata.resumeBullets, [])
})

test('appendUniqueSkills keeps order and removes duplicates', () => {
  assert.deepEqual(
    appendUniqueSkills(['A', 'B'], ['B', 'C', '', 'A']),
    ['A', 'B', 'C'],
  )
})

test('appendUniqueSkills treats non-array inputs as empty arrays', () => {
  assert.deepEqual(appendUniqueSkills(null, ['A']), ['A'])
})
