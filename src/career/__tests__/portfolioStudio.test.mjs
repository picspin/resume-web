import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildPortfolioDraft,
  extractSkillSuggestions,
  normalizeProjectInput,
} from '../portfolioDrafts.js'

test('normalizes project input with local project image and github url', () => {
  const normalized = normalizeProjectInput({
    title: 'Contrast AI workflow',
    projectType: 'medical-ai',
    role: 'Product and application lead',
    dateRange: '2024',
    githubUrl: 'https://github.com/picspin/contrast-ai',
    imagePath: '/images/projects/project-16.png',
    rawText: 'Built a RAG workflow for contrast media education and field enablement.',
  })

  assert.equal(normalized.title, 'Contrast AI workflow')
  assert.equal(normalized.projectType, 'medical-ai')
  assert.equal(normalized.githubUrl, 'https://github.com/picspin/contrast-ai')
  assert.equal(normalized.imagePath, '/images/projects/project-16.png')
})

test('extracts categorized medical digital and AI skills from project and JD text', () => {
  const suggestions = extractSkillSuggestions({
    projectType: 'medical-ai',
    rawText: 'Built an LLM RAG assistant for radiology workflow and medical imaging education.',
    jdText: 'Looking for digital health, medical AI, workflow product strategy, and stakeholder collaboration.',
  })

  assert.deepEqual(
    suggestions.map((item) => item.category),
    ['Medical AI & Digital Health', 'Product & Commercialization', 'Execution Evidence'],
  )
  assert.ok(suggestions[0].skills.some((skill) => /RAG/i.test(skill)))
  assert.ok(suggestions[1].skills.some((skill) => /product strategy/i.test(skill)))
})

test('builds a reviewed web resume project draft and json patch', () => {
  const draft = buildPortfolioDraft({
    title: 'Radiology RAG Enablement',
    projectType: 'llm-rag',
    role: 'Solution owner',
    dateRange: '2025',
    githubUrl: 'https://github.com/picspin/radiology-rag',
    imagePath: '/images/projects/project-24.jpg',
    rawText: 'Designed a RAG-based internal training assistant for radiology product education, using curated product knowledge and retrieval workflows.',
    jdText: 'Medical AI product role requiring LLM workflow, stakeholder enablement, and evidence-based communication.',
  })

  assert.equal(draft.webProject.title, 'Radiology RAG Enablement')
  assert.equal(draft.webProject.image, '/images/projects/project-24.jpg')
  assert.match(draft.webProject.description, /Solution owner/)
  assert.match(draft.resumeBullet, /RAG-based internal training assistant/)
  assert.match(draft.aiPrompt, /Do not invent metrics/)
  assert.equal(draft.jsonPatch.projects[0].title, 'Radiology RAG Enablement')
  assert.ok(draft.jsonPatch.skills.length > 0)
  assert.equal(typeof draft.jsonPatch.skills[0], 'string')
  assert.ok(draft.jsonPatch.skillSuggestions.length > 0)
  assert.deepEqual(draft.warnings, [])
})

test('warns when raw evidence is missing', () => {
  const draft = buildPortfolioDraft({
    title: 'Unscoped project',
    projectType: 'medical-ai',
  })

  assert.ok(draft.warnings.some((warning) => /evidence/i.test(warning)))
  assert.match(draft.aiPrompt, /review-only draft/i)
})

test('escapes html before producing web resume project descriptions', () => {
  const draft = buildPortfolioDraft({
    title: '<Medical AI>',
    projectType: 'medical-ai',
    role: '<img src=x onerror=alert(1)>',
    githubUrl: 'https://github.com/picspin/demo?<script>alert(1)</script>',
    imagePath: '/images/projects/project-1.jpg',
    rawText: 'Built <script>alert(1)</script> and <img src=x onerror=alert(2)> workflow.',
  })

  assert.doesNotMatch(draft.webProject.title, /</)
  assert.doesNotMatch(draft.webProject.description, /<script/i)
  assert.doesNotMatch(draft.webProject.description, /<img/i)
  assert.match(draft.webProject.description, /&lt;script&gt;/)
  assert.match(draft.webProject.description, /&lt;img src=x/)
})
