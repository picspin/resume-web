export const FALLBACK_PROJECT_IMAGE =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"%3E%3Crect width="600" height="400" fill="%23e5e7eb"/%3E%3Cpath d="M210 250h180l-45-60-38 48-28-36-69 48Z" fill="%239ca3af"/%3E%3Ccircle cx="245" cy="165" r="26" fill="%23cbd5e1"/%3E%3C/svg%3E'

const LEGACY_PROJECT_IMAGE_PATHS = new Set([
  '/images/projects/image.png',
  '/images/projects/image2.png',
  '/images/gihub.gif',
  '/images/github.gif',
])

const PROJECT_IMAGE_EXTENSIONS = ['jpg', 'png', 'gif', 'jpeg', 'webp', 'JPG', 'PNG', 'GIF', 'JPEG', 'WEBP']

function hasKnownProjectImage(path, availableImages) {
  return availableImages instanceof Set && availableImages.has(path)
}

function isLegacyProjectImage(path) {
  return LEGACY_PROJECT_IMAGE_PATHS.has(path)
}

export function resolveProjectImage(project = {}, index = 0, availableImages = null) {
  const candidates = buildProjectImageCandidates(project, index)

  for (const candidate of candidates) {
    if (hasKnownProjectImage(candidate, availableImages)) {
      return candidate
    }
  }

  return candidates[0] || FALLBACK_PROJECT_IMAGE
}

export function buildProjectImageCandidates(project = {}, base = import.meta.env?.BASE_URL || '/') {
  // Existing renderers pass a numeric legacy index as the second argument.
  if (typeof base !== 'string') base = import.meta.env?.BASE_URL || '/'
  const explicitImage = typeof project.image === 'string' ? project.image.trim() : ''
  const projectNumber = project.projectNumber
  const candidates = []

  if (safeImageUrl(explicitImage) && !isLegacyProjectImage(explicitImage)) {
    candidates.push(safeImageUrl(explicitImage, base))
  }

  for (const ext of Number.isSafeInteger(projectNumber) && projectNumber > 0 ? PROJECT_IMAGE_EXTENSIONS : []) {
    candidates.push(safeImageUrl(`/images/projects/project-${projectNumber}.${ext}`, base))
  }

  candidates.push(FALLBACK_PROJECT_IMAGE)

  return [...new Set(candidates)]
}

export function safeImageUrl(value = '', base = import.meta.env?.BASE_URL || '/') {
  if (typeof value !== 'string') return ''
  const url = value.trim()
  if (/^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(url) && url.length <= 2800000) return url
  if (/^\/images\/[a-z0-9_./%-]+$/i.test(url) && !url.includes('..')) return `${base.replace(/\/$/, '')}${url}`
  try { const parsed = new URL(url); return parsed.protocol === 'https:' && !parsed.username && !parsed.password ? parsed.href : '' } catch { return '' }
}

export function safeLink(value = '') {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined } catch { return undefined }
}

export async function readResumeImage(file) {
  if (!file || !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) throw new Error('Choose a PNG, JPEG, WebP or GIF image.')
  if (file.size > 2 * 1024 * 1024) throw new Error('Images must be 2 MB or smaller.')
  const value = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Could not read image.'))
    reader.readAsDataURL(file)
  })
  await new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => image.width * image.height <= 16000000 ? resolve() : reject(new Error('Image must be at most 16 megapixels.'))
    image.onerror = () => reject(new Error('Invalid raster image.'))
    image.src = value
  })
  return value
}
