export async function loadCareerVersions() {
  const response = await fetch('/src/data/career-versions.local.json', { cache: 'no-store' })
  if (!response.ok) {
    return []
  }
  const data = await response.json()
  return Array.isArray(data) ? data : []
}

export async function loadCareerJobs() {
  const response = await fetch('/api/career/jobs', { cache: 'no-store' })
  if (!response.ok) return []
  const data = await response.json()
  return Array.isArray(data.jobs) ? data.jobs : []
}

export async function loadCareerRuns() {
  const response = await fetch('/api/career/runs', { cache: 'no-store' })
  if (!response.ok) return []
  const data = await response.json()
  return Array.isArray(data.runs) ? data.runs : []
}
