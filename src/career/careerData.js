export async function loadCareerVersions() {
  const response = await fetch('/src/data/career-versions.local.json', { cache: 'no-store' })
  if (!response.ok) {
    return []
  }
  const data = await response.json()
  return Array.isArray(data) ? data : []
}
