#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'

if (!fs.existsSync('.git') || !fs.existsSync('.githooks')) {
  process.exit(0)
}

try {
  execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'ignore' })
  console.log('Git hooks path set to .githooks')
} catch {
  console.warn('Unable to install git hooks automatically. Run: git config core.hooksPath .githooks')
}
