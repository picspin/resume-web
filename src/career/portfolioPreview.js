function cloneResume(baseResume = {}) {
  return JSON.parse(JSON.stringify(baseResume || {}))
}

export function appendUniqueSkills(baseSkills = [], nextSkills = []) {
  const seen = new Set()
  return [...baseSkills, ...nextSkills]
    .filter((skill) => typeof skill === 'string' && skill.trim())
    .filter((skill) => {
      const key = skill.trim()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export function buildResumePreview(baseResume = {}, draft = null) {
  const resume = cloneResume(baseResume)
  const metadata = {
    resumeBullets: [],
    warnings: [],
    reviewOnly: Boolean(draft),
  }

  if (!Array.isArray(resume.skills)) resume.skills = []
  if (!Array.isArray(resume.projects)) resume.projects = []

  if (!draft?.webProject) {
    return { resume, metadata }
  }

  const nextSkills = Array.isArray(draft.jsonPatch?.skills) ? draft.jsonPatch.skills : []
  resume.projects = [...resume.projects, draft.webProject]
  resume.skills = appendUniqueSkills(resume.skills, nextSkills)
  metadata.resumeBullets = Array.isArray(draft.jsonPatch?.resumeBullets) ? draft.jsonPatch.resumeBullets : []
  metadata.warnings = Array.isArray(draft.warnings) ? draft.warnings : []

  return { resume, metadata }
}
