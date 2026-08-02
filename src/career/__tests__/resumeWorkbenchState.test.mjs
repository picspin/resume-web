import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPortfolioDraft } from '../portfolioDrafts.js'
import {
  addResumeItem,
  applyDraftProject,
  applyDraftSkills,
  createEditableResume,
  removeResumeItem,
  updateResumeItemField,
} from '../resumeWorkbenchState.js'

test('createEditableResume returns a safe editable clone with expected array sections', () => {
  const baseResume = {
    general: { name: 'Xiaolei Zhu' },
    education: [{ degree: 'PhD' }],
    skills: ['Medical AI'],
    projects: [],
  }

  const editable = createEditableResume(baseResume)

  assert.notEqual(editable, baseResume)
  assert.notEqual(editable.education, baseResume.education)
  assert.deepEqual(editable.certificates, [])
  assert.deepEqual(editable.publications, [])
})

test('updateResumeItemField edits nested resume sections without mutating the source resume', () => {
  const baseResume = {
    education: [{ degree: 'PhD', institution: 'CAS' }],
    work: [{ title: 'Senior Application Manager', details: ['Built clinical tools.'] }],
  }

  const updated = updateResumeItemField(baseResume, 'work', 0, 'details.0', 'Built clinical AI tools.')

  assert.equal(baseResume.work[0].details[0], 'Built clinical tools.')
  assert.equal(updated.work[0].details[0], 'Built clinical AI tools.')
})

test('addResumeItem and removeResumeItem update module arrays immutably', () => {
  const baseResume = { projects: [{ title: 'Existing' }] }
  const added = addResumeItem(baseResume, 'projects', { title: 'New Project' })
  const removed = removeResumeItem(added, 'projects', 0)

  assert.equal(baseResume.projects.length, 1)
  assert.deepEqual(added.projects.map((project) => project.title), ['Existing', 'New Project'])
  assert.deepEqual(removed.projects.map((project) => project.title), ['New Project'])
})

test('applyDraftProject and applyDraftSkills move Portfolio Studio output into the editable resume', () => {
  const baseResume = { skills: ['Medical AI'], projects: [] }
  const draft = buildPortfolioDraft({
    title: 'Radiology RAG Enablement',
    projectType: 'llm-rag',
    imagePath: '/images/projects/project-24.jpg',
    rawText: 'Built a RAG workflow for radiology product education.',
  })

  const withProject = applyDraftProject(baseResume, draft)
  const withSkills = applyDraftSkills(withProject, draft)

  assert.equal(baseResume.projects.length, 0)
  assert.equal(withProject.projects[0].title, 'Radiology RAG Enablement')
  assert.ok(withSkills.skills.length > baseResume.skills.length)
  assert.equal(new Set(withSkills.skills).size, withSkills.skills.length)
})
