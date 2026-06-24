import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

async function pathExists(path) {
  try {
    await readFile(path, 'utf8')
    return true
  } catch {
    return false
  }
}

const root = process.cwd()
const versionsDir = join(root, 'career', 'versions')
const slugs = await readdir(versionsDir)
const versions = []

for (const slug of slugs) {
  const metadataPath = join(versionsDir, slug, 'metadata.json')
  const resumePath = join(versionsDir, slug, 'resume.json')
  if (!(await pathExists(metadataPath)) || !(await pathExists(resumePath))) continue
  const metadata = JSON.parse(await readFile(metadataPath, 'utf8'))
  const resume = JSON.parse(await readFile(resumePath, 'utf8'))
  versions.push({
    slug,
    label: metadata.roleLabel || slug,
    archetype: metadata.archetypes?.[0]?.label || 'Medical Role',
    generatedAt: metadata.generatedAt,
    pdfPath: metadata.pdf?.publicPath || '',
    resume,
    metadata,
  })
}

versions.sort((a, b) => String(b.generatedAt).localeCompare(String(a.generatedAt)))
await mkdir(join(root, 'src', 'data'), { recursive: true })
await writeFile(join(root, 'src', 'data', 'resume-versions.json'), `${JSON.stringify(versions, null, 2)}\n`, 'utf8')
console.log(`Wrote ${versions.length} resume version(s)`)
