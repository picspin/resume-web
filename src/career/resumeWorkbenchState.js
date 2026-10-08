import { appendUniqueSkills } from './portfolioPreview.js'

export const RESUME_WORKBENCH_STORAGE_KEY = 'career.resumeWorkbenchDraft.v1'

export const EDITABLE_RESUME_SECTIONS = [
  'education',
  'work',
  'skills',
  'certificates',
  'projects',
  'publications',
  'posters',
  'patents',
]

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? {}))
}

export function createEditableResume(baseResume = {}) {
  const resume = clone(baseResume)

  for (const section of EDITABLE_RESUME_SECTIONS) {
    if (!Array.isArray(resume[section])) {
      resume[section] = []
    }
  }

  return resume
}

function setNestedField(target, fieldPath, value) {
  const segments = String(fieldPath).split('.').filter(Boolean)
  if (segments.length === 0) return

  let cursor = target
  for (const segment of segments.slice(0, -1)) {
    if (cursor[segment] === undefined || cursor[segment] === null) {
      cursor[segment] = Number.isInteger(Number(segment)) ? [] : {}
    }
    cursor = cursor[segment]
  }

  cursor[segments[segments.length - 1]] = value
}

export function updateResumeItemField(baseResume, section, index, fieldPath, value) {
  const resume = createEditableResume(baseResume)
  if (!Array.isArray(resume[section]) || !resume[section][index]) return resume

  if (typeof resume[section][index] === 'string') {
    resume[section][index] = value
    return resume
  }

  setNestedField(resume[section][index], fieldPath, value)
  return resume
}

export function addResumeItem(baseResume, section, item) {
  const resume = createEditableResume(baseResume)
  resume[section] = [...(resume[section] || []), clone(item)]
  return resume
}

export function removeResumeItem(baseResume, section, index) {
  const resume = createEditableResume(baseResume)
  resume[section] = (resume[section] || []).filter((_, itemIndex) => itemIndex !== index)
  return resume
}

export function applyDraftProject(baseResume, draft) {
  if (!draft?.webProject) return createEditableResume(baseResume)
  return addResumeItem(baseResume, 'projects', draft.webProject)
}

export function applyDraftSkills(baseResume, draft) {
  const resume = createEditableResume(baseResume)
  const nextSkills = Array.isArray(draft?.jsonPatch?.skills) ? draft.jsonPatch.skills : []
  resume.skills = appendUniqueSkills(resume.skills, nextSkills)
  return resume
}

export function loadResumeWorkbenchDraft(storage = globalThis.localStorage) {
  if (!storage) return null
  try {
    const raw = storage.getItem(RESUME_WORKBENCH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export function saveResumeWorkbenchDraft(resume, storage = globalThis.localStorage) {
  if (!storage) return false
  try {
    storage.setItem(
      RESUME_WORKBENCH_STORAGE_KEY,
      JSON.stringify({ resume: createEditableResume(resume), updatedAt: new Date().toISOString() }),
    )
    return true
  } catch {
    return false
  }
}

export function clearResumeWorkbenchDraft(storage = globalThis.localStorage) {
  if (!storage) return false
  try {
    storage.removeItem(RESUME_WORKBENCH_STORAGE_KEY)
    return true
  } catch {
    return false
  }
}
