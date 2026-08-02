#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const TEXT_EXTENSIONS = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mjs',
  '.txt',
  '.yaml',
  '.yml',
])

const args = new Set(process.argv.slice(2))
const checkOnly = args.has('--check')
const allFiles = args.has('--all')
const failOnWrite = args.has('--fail-on-write')

function gitFiles(commandArgs) {
  return execFileSync('git', commandArgs, { encoding: 'utf8' })
    .split('\n')
    .map((file) => file.trim())
    .filter(Boolean)
}

function candidateFiles() {
  const files = allFiles
    ? gitFiles(['ls-files'])
    : gitFiles(['diff', '--cached', '--name-only', '--diff-filter=ACMR'])

  return files.filter((file) => {
    if (file.startsWith('public/images/')) return false
    if (file.startsWith('dist/') || file.startsWith('node_modules/')) return false
    return TEXT_EXTENSIONS.has(path.extname(file))
  })
}

function formatText(text) {
  return `${text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n*$/g, '')}\n`
}

const changed = []

for (const file of candidateFiles()) {
  if (!fs.existsSync(file)) continue

  const before = fs.readFileSync(file, 'utf8')
  const after = formatText(before)
  if (before === after) continue

  changed.push(file)
  if (!checkOnly) {
    fs.writeFileSync(file, after)
  }
}

if (changed.length > 0) {
  const verb = checkOnly ? 'need formatting' : 'formatted'
  console.error(`Files ${verb}:\n${changed.map((file) => `  - ${file}`).join('\n')}`)
  process.exit(checkOnly || failOnWrite ? 1 : 0)
}
