import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { buildManifests } from './lib/manifest.mjs'

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
const records = []

for (const slug of slugs) {
  const metadataPath = join(versionsDir, slug, 'metadata.json')
  const resumePath = join(versionsDir, slug, 'resume.json')
  const evaluationPath = join(versionsDir, slug, 'evaluation.md')
  if (!(await pathExists(metadataPath)) || !(await pathExists(resumePath))) continue
  const metadata = JSON.parse(await readFile(metadataPath, 'utf8'))
  const resume = JSON.parse(await readFile(resumePath, 'utf8'))
  const evaluationMarkdown = await pathExists(evaluationPath) ? await readFile(evaluationPath, 'utf8') : ''
  records.push({ slug, metadata, resume, evaluationMarkdown })
}

const { publicVersions, careerVersions } = buildManifests(records)
await mkdir(join(root, 'src', 'data'), { recursive: true })
await writeFile(join(root, 'src', 'data', 'resume-versions.json'), `${JSON.stringify(publicVersions, null, 2)}\n`, 'utf8')
await writeFile(join(root, 'src', 'data', 'career-versions.local.json'), `${JSON.stringify(careerVersions, null, 2)}\n`, 'utf8')
console.log(`Wrote ${publicVersions.length} public resume version(s) and ${careerVersions.length} local career version(s)`)
