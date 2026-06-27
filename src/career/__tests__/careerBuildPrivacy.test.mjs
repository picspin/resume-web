import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const forbiddenMarkers = [
  'Career Console',
  'Application Board',
  'Manual Apply Pack',
  'Portfolio Studio',
  'Project and skills draft builder',
  'resumeOps.portfolioDrafts.v1',
  'review payload',
  'No files are changed',
  'Open local Career Console',
  'BriefcaseBusiness',
  'career-versions.local.json',
  'VITE_ENABLE_CAREER_CONSOLE',
]

async function collectFiles(rootDir) {
  const entries = await fs.readdir(rootDir, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(rootDir, entry.name)
    if (entry.isDirectory()) {
      return collectFiles(entryPath)
    }
    return [entryPath]
  }))

  return files.flat()
}

async function buildApp(env = {}) {
  const outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'resume-build-'))
  const viteBin = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js')

  await execFileAsync(
    process.execPath,
    [viteBin, 'build', '--outDir', outDir, '--emptyOutDir'],
    {
      cwd: projectRoot,
      env: { ...process.env, ...env },
    },
  )

  return outDir
}

test('careerBuildPrivacy test derives project root instead of hard-coding a worktree path', async () => {
  const source = await fs.readFile(new URL(import.meta.url), 'utf8')

  assert.doesNotMatch(source, /\/private\/tmp\/resume-web-worktrees\/codex\/medical-resume-ops/)
  assert.equal(projectRoot, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..'))
})

test('default production build does not emit detailed career console code', async () => {
  const outDir = await buildApp()
  const files = await collectFiles(outDir)
  const jsFiles = files.filter((file) => file.endsWith('.js'))
  const contents = await Promise.all(jsFiles.map((file) => fs.readFile(file, 'utf8')))

  for (const marker of forbiddenMarkers) {
    assert.equal(
      contents.some((content) => content.includes(marker)),
      false,
      `found forbidden production marker "${marker}" in default build output`,
    )
  }
})

test('production build serves a generic career fallback without local workflow hints', async () => {
  const outDir = await buildApp()
  const html = await fs.readFile(path.join(outDir, 'index.html'), 'utf8')
  const jsFiles = (await collectFiles(outDir)).filter((file) => file.endsWith('.js'))
  const contents = (await Promise.all(jsFiles.map((file) => fs.readFile(file, 'utf8')))).join('\n')

  assert.doesNotMatch(contents, /Career console is local-only/)
  assert.doesNotMatch(contents, /VITE_ENABLE_CAREER_CONSOLE/)
  assert.match(html, /<div id="root"><\/div>/)
})
