export const PORTFOLIO_STORAGE_KEY = 'resumeOps.portfolioDrafts.v1'

export const PROJECT_TYPE_OPTIONS = [
  { value: 'medical-ai', label: 'Medical AI / Imaging AI' },
  { value: 'llm-rag', label: 'LLM / RAG Enablement' },
  { value: 'digital-health', label: 'Digital Health / Workflow' },
  { value: 'device-rd', label: 'Medical Device R&D' },
  { value: 'bd-commercial', label: 'Medical BD / Commercialization' },
  { value: 'open-source', label: 'Open Source / GitHub' },
]

const FALLBACK_PROJECT_TYPE = 'medical-ai'
const FALLBACK_PROJECT_IMAGE = '/images/projects/project-1.jpg'

const TYPE_DEFAULTS = {
  'medical-ai': {
    category: 'Medical AI & Digital Health',
    skills: ['Medical AI product translation', 'Radiology workflow analysis', 'Evidence-based clinical communication'],
  },
  'llm-rag': {
    category: 'Medical AI & Digital Health',
    skills: ['LLM/RAG workflow design', 'Knowledge-base curation', 'AI enablement for medical education'],
  },
  'digital-health': {
    category: 'Medical AI & Digital Health',
    skills: ['Digital health workflow design', 'Clinical operations digitization', 'Cross-functional user discovery'],
  },
  'device-rd': {
    category: 'Medical Device R&D',
    skills: ['Medical device product definition', 'Design-control aware documentation', 'R&D and clinical requirement mapping'],
  },
  'bd-commercial': {
    category: 'Product & Commercialization',
    skills: ['Medical commercialization strategy', 'KOL and stakeholder engagement', 'Market access narrative building'],
  },
  'open-source': {
    category: 'Execution Evidence',
    skills: ['GitHub project delivery', 'Technical documentation', 'Reusable workflow packaging'],
  },
}

const SKILL_RULES = [
  {
    category: 'Medical AI & Digital Health',
    patterns: [
      [/rag|retrieval|知识库|检索增强/i, 'LLM/RAG workflow design'],
      [/llm|large language|prompt|agent|ai assistant/i, 'Medical AI assistant prototyping'],
      [/radiology|imaging|影像|ct|mri|ultrasound/i, 'Radiology and imaging workflow translation'],
      [/digital health|workflow|saas|platform|数字化|流程/i, 'Digital health workflow design'],
      [/medical ai|clinical ai|医疗ai|ai product/i, 'Medical AI product translation'],
    ],
  },
  {
    category: 'Product & Commercialization',
    patterns: [
      [/product strategy|roadmap|产品策略|定位/i, 'Product strategy for medical solutions'],
      [/stakeholder|kol|sales|bd|commercial|客户|协同/i, 'Stakeholder collaboration and commercial enablement'],
      [/market|gtm|go-to-market|launch|access|市场/i, 'Go-to-market narrative building'],
      [/training|education|enablement|培训|赋能/i, 'Field enablement and product education'],
    ],
  },
  {
    category: 'Execution Evidence',
    patterns: [
      [/github|repo|repository|open source|开源/i, 'GitHub-based project delivery'],
      [/prototype|mvp|demo|proof|验证/i, 'Prototype-to-demo execution'],
      [/dashboard|automation|pipeline|自动化/i, 'Workflow automation and operational reporting'],
      [/documentation|manual|playbook|文档/i, 'Reusable documentation and playbook writing'],
    ],
  },
]

function cleanText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function unique(items) {
  return [...new Set(items.filter(Boolean))]
}

function firstSentence(text) {
  const cleaned = cleanText(text)
  if (!cleaned) return ''
  const match = cleaned.match(/^(.{1,220}?)(?:[.!?。！？]|$)/)
  return cleanText(match?.[1] || cleaned.slice(0, 220))
}

function escapeHtml(value) {
  return cleanText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatSkillLines(skillSuggestions) {
  return skillSuggestions.map((group) => `${group.category}: ${group.skills.join(', ')}.`)
}

export function normalizeProjectInput(input = {}) {
  const projectType = PROJECT_TYPE_OPTIONS.some((option) => option.value === input.projectType)
    ? input.projectType
    : FALLBACK_PROJECT_TYPE

  return {
    title: cleanText(input.title) || 'Untitled medical portfolio project',
    projectType,
    role: cleanText(input.role),
    dateRange: cleanText(input.dateRange),
    githubUrl: cleanText(input.githubUrl),
    imagePath: cleanText(input.imagePath),
    rawText: cleanText(input.rawText),
    jdText: cleanText(input.jdText),
  }
}

export function extractSkillSuggestions(input = {}) {
  const normalized = normalizeProjectInput(input)
  const haystack = [normalized.projectType, normalized.rawText, normalized.jdText].join(' ')
  const grouped = new Map()
  const typeDefaults = TYPE_DEFAULTS[normalized.projectType] || TYPE_DEFAULTS[FALLBACK_PROJECT_TYPE]

  grouped.set(typeDefaults.category, [...typeDefaults.skills])

  SKILL_RULES.forEach(({ category, patterns }) => {
    patterns.forEach(([pattern, skill]) => {
      if (pattern.test(haystack)) {
        grouped.set(category, [...(grouped.get(category) || []), skill])
      }
    })
  })

  const executionSkills = grouped.get('Execution Evidence') || []
  if (normalized.rawText) {
    grouped.set('Execution Evidence', [...executionSkills, 'Evidence-backed resume storytelling'])
  }

  return ['Medical AI & Digital Health', 'Medical Device R&D', 'Product & Commercialization', 'Execution Evidence']
    .filter((category) => grouped.has(category))
    .map((category) => ({
      category,
      skills: unique(grouped.get(category)).slice(0, 5),
    }))
}

export function buildPortfolioDraft(input = {}) {
  const normalized = normalizeProjectInput(input)
  const skillSuggestions = extractSkillSuggestions(normalized)
  const warnings = []
  const rolePrefix = normalized.role ? `${normalized.role}${normalized.dateRange ? `, ${normalized.dateRange}` : ''}. ` : ''
  const evidenceSummary = firstSentence(normalized.rawText)

  if (!normalized.rawText) {
    warnings.push('Add concrete project evidence before using this draft in a public resume.')
  }
  if (!normalized.imagePath) {
    warnings.push('Add a project image path under /images/projects/ to preserve the web resume preview layout.')
  }

  const descriptionCore = evidenceSummary || 'Review-only draft. Replace with verified project evidence before publishing.'
  const descriptionParts = [
    rolePrefix && escapeHtml(rolePrefix),
    escapeHtml(descriptionCore),
    normalized.githubUrl && `GitHub: ${escapeHtml(normalized.githubUrl)}`,
  ].filter(Boolean)
  const skillLines = formatSkillLines(skillSuggestions)

  const webProject = {
    projectNumber: 'draft',
    title: escapeHtml(normalized.title),
    description: descriptionParts.join(' '),
    image: normalized.imagePath || FALLBACK_PROJECT_IMAGE,
  }

  const resumeBullet = `${normalized.title}: ${rolePrefix}${descriptionCore}`.trim()
  const flatSkills = skillSuggestions.flatMap((group) => group.skills)
  const reviewMode = warnings.length ? 'This is a review-only draft because evidence is missing or incomplete.' : ''
  const aiPrompt = [
    'Polish this project for a medical industry resume and web portfolio.',
    'Keep claims evidence-backed. Do not invent metrics, employers, users, revenue, regulatory status, or clinical outcomes.',
    'Prioritize fit for medical devices, digital health, medical AI, product strategy, and commercial enablement roles.',
    reviewMode,
    `Project title: ${normalized.title}`,
    `Role/date: ${cleanText([normalized.role, normalized.dateRange].filter(Boolean).join(', ')) || 'Not specified'}`,
    `Project type: ${normalized.projectType}`,
    `GitHub URL: ${normalized.githubUrl || 'Not specified'}`,
    `Image path: ${normalized.imagePath || 'Not specified'}`,
    `Evidence: ${normalized.rawText || 'Missing; ask for evidence before finalizing.'}`,
    `Target JD context: ${normalized.jdText || 'Not provided'}`,
    `Suggested skills: ${flatSkills.join(', ') || 'None'}`,
  ]
    .filter(Boolean)
    .join('\n')

  return {
    input: normalized,
    webProject,
    resumeBullet,
    skillSuggestions,
    aiPrompt,
    jsonPatch: {
      projects: [webProject],
      skills: skillLines,
      skillSuggestions,
      resumeBullets: [resumeBullet],
      source: {
        githubUrl: normalized.githubUrl,
        projectType: normalized.projectType,
        jdAware: Boolean(normalized.jdText),
      },
    },
    warnings,
  }
}
