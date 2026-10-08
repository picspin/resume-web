import sampleEn from '../data/resume-en.json' with { type: 'json' }
import sampleZh from '../data/resume-zh.json' with { type: 'json' }

export const THEMES = Object.freeze(['default', 'nord', 'monokai', 'github'])
export const SECTION_ORDER = Object.freeze(['summary', 'education', 'work', 'skills', 'certificates', 'projects', 'publications', 'posters', 'patents'])
const generalFields = ['name', 'headline', 'location', 'photo', 'address', 'email_work', 'email_private', 'tel']
const fields = {
  education: ['degree', 'major', 'institution', 'date', 'year'],
  work: ['title', 'company', 'date', 'location', 'details'],
  projects: ['title', 'description', 'image', 'projectNumber', 'link'],
  publications: ['type', 'title', 'authors', 'journal', 'link'],
  patents: ['title', 'authors', 'link'],
  certificates: ['title', 'organization', 'date'],
  posters: ['title', 'authors', 'event', 'conference', 'date', 'link'],
}

export class ResumeStorageError extends Error {
  constructor(code, message, options) {
    super(message, options)
    this.name = 'ResumeStorageError'
    this.code = code
  }
}
export const clone = (value) => JSON.parse(JSON.stringify(value))
export const newId = () => globalThis.crypto.randomUUID()
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const string = (value) => typeof value === 'string' ? value : ''
export function validate(condition, message) {
  if (!condition) throw new ResumeStorageError('validation', message)
}

export function sanitizeResume(value) {
  validate(object(value), 'Resume must be an object.')
  const general = object(value.general) ? value.general : {}
  const resume = {
    general: Object.fromEntries(generalFields.map((key) => [key, string(general[key])])),
    summary: string(value.summary),
    banner: string(value.banner),
    sectionTitles: Object.fromEntries(['general', ...SECTION_ORDER].filter((key) => typeof value.sectionTitles?.[key] === 'string').map((key) => [key, value.sectionTitles[key]])),
    skills: Array.isArray(value.skills) ? value.skills.filter((item) => typeof item === 'string') : [],
  }
  for (const [section, keys] of Object.entries(fields)) {
    resume[section] = (Array.isArray(value[section]) ? value[section] : []).filter(object).map((item) => {
      const entry = {}
      for (const key of keys) {
        if (key === 'details') entry[key] = Array.isArray(item[key]) ? item[key].filter((line) => typeof line === 'string') : []
        else if (key === 'projectNumber') {
          if (Number.isSafeInteger(item[key]) && item[key] > 0) entry[key] = item[key]
        } else entry[key] = string(item[key])
      }
      return entry
    })
  }
  return resume
}

export function sanitizeDocument(value) {
  validate(object(value) && typeof value.id === 'string' && value.id.length > 0, 'Document ID is required.')
  validate(typeof value.name === 'string' && value.name.trim().length > 0, 'Document name is required.')
  validate(Number.isSafeInteger(value.revision) && value.revision >= 0, 'Invalid revision.')
  validate(THEMES.includes(value.theme), 'Invalid theme.')
  const source = { kind: 'blank' }
  if (['personal-sample', 'blank', 'duplicate', 'optimized', 'restored'].includes(value.source?.kind)) {
    source.kind = value.source.kind
    if (source.kind === 'personal-sample' && value.source.sampleId === 'xiaolei') source.sampleId = 'xiaolei'
    for (const key of ['documentId', 'versionId', 'requestId']) {
      if (source.kind !== 'personal-sample' && typeof value.source[key] === 'string') source[key] = value.source[key]
    }
  }
  const order = [...new Set((Array.isArray(value.sectionOrder) ? value.sectionOrder : []).filter((key) => SECTION_ORDER.includes(key)))]
  return {
    id: value.id, name: value.name.trim(), resume: sanitizeResume(value.resume), theme: value.theme,
    sectionOrder: [...order, ...SECTION_ORDER.filter((key) => !order.includes(key))],
    hiddenSections: [...new Set((Array.isArray(value.hiddenSections) ? value.hiddenSections : []).filter((key) => SECTION_ORDER.includes(key)))],
    revision: value.revision, source,
  }
}

export function createDocument({ mode = 'blank', sourceDocument, language = 'en' } = {}) {
  validate(['blank', 'sample', 'duplicate'].includes(mode), 'Invalid creation mode.')
  validate(['en', 'zh'].includes(language), 'Invalid language.')
  if (mode === 'duplicate') {
    const original = sanitizeDocument(sourceDocument)
    return { ...original, id: newId(), name: `${original.name} (copy)`, revision: 0, source: { kind: 'duplicate', documentId: original.id } }
  }
  const resume = sanitizeResume(mode === 'sample' ? (language === 'zh' ? sampleZh : sampleEn) : {})
  if (mode === 'sample') {
    resume.general.headline = language === 'zh' ? '应用经理' : 'Application Manager'
    resume.general.location = 'Guangzhou, China'
    resume.general.photo = '/images/Avatar.jpg'
    resume.banner = '/images/banner.jpeg'
  }
  return {
    id: newId(), name: mode === 'sample' ? 'Xiaolei Zhu' : 'Untitled resume', resume,
    theme: 'default', sectionOrder: [...SECTION_ORDER], hiddenSections: [], revision: 0,
    source: mode === 'sample' ? { kind: 'personal-sample', sampleId: 'xiaolei' } : { kind: 'blank' },
  }
}
