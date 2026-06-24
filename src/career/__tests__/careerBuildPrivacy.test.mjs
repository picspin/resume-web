import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const projectRoot = '/private/tmp/resume-web-worktrees/codex/medical-resume-ops'
const forbiddenMarkers = [
  'Career Console',
  'Application Board',
  'Manual Apply Pack',
  'career-versions.local.json',
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
