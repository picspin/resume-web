export const INVALID_SOURCE = 'Invalid source document.'

export function snapshotSourceDocument(source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)
    || typeof source.id !== 'string' || !source.id.trim()
    || !Number.isSafeInteger(source.revision) || source.revision < 0
    || !source.resume || typeof source.resume !== 'object' || Array.isArray(source.resume)
    || !source.resume.general || typeof source.resume.general !== 'object' || Array.isArray(source.resume.general)
    || (source.resume.summary !== undefined && typeof source.resume.summary !== 'string')
    || ['work', 'projects', 'education', 'skills', 'certificates', 'publications', 'posters', 'patents'].some((key) => source.resume[key] !== undefined && !Array.isArray(source.resume[key]))) {
    throw new Error(INVALID_SOURCE)
  }
  const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
  if (Object.values(source.resume.general).some((value) => typeof value !== 'string')
    || (source.resume.skills || []).some((value) => typeof value !== 'string')) throw new Error(INVALID_SOURCE)
  for (const section of ['work', 'projects', 'education', 'certificates', 'publications', 'posters', 'patents']) {
    for (const entry of source.resume[section] || []) {
      if (!record(entry)) throw new Error(INVALID_SOURCE)
      for (const [key, value] of Object.entries(entry)) {
        const valid = key === 'details' ? Array.isArray(value) && value.every((line) => typeof line === 'string')
          : key === 'projectNumber' ? Number.isSafeInteger(value) && value > 0 : typeof value === 'string'
        if (!valid) throw new Error(INVALID_SOURCE)
      }
    }
  }
  try { return JSON.parse(JSON.stringify(source)) } catch { throw new Error(INVALID_SOURCE) }
}

export function validateRequestId(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error('Invalid workflow requestId: expected UUID.')
  }
  return value
}
