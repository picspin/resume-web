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

export function buildProjectImageCandidates(project = {}, index = 0) {
  const explicitImage = typeof project.image === 'string' ? project.image.trim() : ''
  const projectNumber = project.projectNumber || index + 1
  const candidates = []

  if (explicitImage && !isLegacyProjectImage(explicitImage)) {
    candidates.push(explicitImage)
  }

  for (const ext of PROJECT_IMAGE_EXTENSIONS) {
    candidates.push(`/images/projects/project-${projectNumber}.${ext}`)
  }

  candidates.push(FALLBACK_PROJECT_IMAGE)

  return [...new Set(candidates)]
}
