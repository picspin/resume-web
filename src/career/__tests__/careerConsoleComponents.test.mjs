import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

async function importJsxModule(relativePath) {
  const entryPoint = path.join(projectRoot, relativePath)
  const outdir = path.join(projectRoot, '.tmp-career-tests')
  await fs.mkdir(outdir, { recursive: true })
  const outfile = path.join(
    outdir,
    `career-test-${path.basename(relativePath, path.extname(relativePath))}-${Date.now()}-${Math.random().toString(16).slice(2)}.mjs`,
  )

  await build({
    entryPoints: [entryPoint],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    jsx: 'automatic',
    absWorkingDir: projectRoot,
    external: ['react', 'react-dom', 'react-dom/server', 'react/jsx-runtime'],
    loader: {
      '.js': 'js',
      '.jsx': 'jsx',
    },
    logLevel: 'silent',
  })

  return import(`${pathToFileURL(outfile).href}?t=${Date.now()}`)
}

function findElements(node, predicate, matches = []) {
  if (!node || typeof node !== 'object') {
    return matches
  }

  if (predicate(node)) {
    matches.push(node)
  }

  const children = node.props?.children
  if (Array.isArray(children)) {
    for (const child of children) {
      findElements(child, predicate, matches)
    }
  } else if (children) {
    findElements(children, predicate, matches)
  }

  return matches
}

test('careerConsoleComponents test derives project root instead of hard-coding a worktree path', async () => {
  const source = await fs.readFile(new URL(import.meta.url), 'utf8')

  assert.doesNotMatch(source, /\/private\/tmp\/resume-web-worktrees\/codex\/medical-resume-ops/)
  assert.equal(projectRoot, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..'))
})

test('loadCareerConsoleState clears loading and surfaces a compact error on loader failure', async () => {
  const module = await importJsxModule('src/career/CareerConsole.jsx')
  const result = await module.loadCareerConsoleState(async () => {
    throw new Error('bad json')
  })

  assert.equal(result.loading, false)
  assert.deepEqual(result.careerVersions, [])
  assert.match(result.loadError, /unable to load/i)
})

test('CareerConsole renders the local Portfolio Studio entry point', async () => {
  const { default: CareerConsole } = await importJsxModule('src/career/CareerConsole.jsx')
  const html = renderToStaticMarkup(React.createElement(CareerConsole))

  assert.match(html, /Portfolio Studio/)
  assert.match(html, /review payload/i)
  assert.match(html, /No files are changed/i)
})

test('ApplicationBoard row button selection calls onSelect with the row slug', async () => {
  const { default: ApplicationBoard } = await importJsxModule('src/career/ApplicationBoard.jsx')
  const rows = [
    { slug: 'medical-ai', label: 'Medical AI Lead', archetype: 'Medical AI', nextAction: 'Review evidence', status: 'generated' },
    { slug: 'medical-ops', label: 'Medical Ops Lead', archetype: 'Medical Ops', nextAction: 'Submit manually', status: 'ready_to_apply' },
  ]
  const selected = []
  const tree = ApplicationBoard({ rows, selectedSlug: 'medical-ai', onSelect: (slug) => selected.push(slug), onUpdate: () => {} })
  const buttons = findElements(tree, (node) => node.type === 'button')

  assert.equal(buttons.length, 2)
  buttons[1].props.onClick()
  assert.deepEqual(selected, ['medical-ops'])
})

test('ApplicationBoard status selector sends the row slug and next status to onUpdate', async () => {
  const { default: ApplicationBoard } = await importJsxModule('src/career/ApplicationBoard.jsx')
  const rows = [
    {
      slug: 'medical-ai',
      label: 'Medical AI Lead',
      archetype: 'Medical AI',
      nextAction: 'Review evidence',
      status: 'generated',
      pdfPath: '/generated-resumes/medical-ai.pdf',
    },
  ]
  const updates = []
  const tree = ApplicationBoard({ rows, selectedSlug: 'medical-ai', onSelect: () => {}, onUpdate: (slug, patch) => updates.push([slug, patch]) })
  const selects = findElements(tree, (node) => node.type === 'select')

  assert.equal(selects.length, 1)
  selects[0].props.onChange({ target: { value: 'applied' } })
  assert.deepEqual(updates, [['medical-ai', { status: 'applied' }]])
})

test('ApplicationBoard renders PDF links that open the generated resume in a new tab', async () => {
  const { default: ApplicationBoard } = await importJsxModule('src/career/ApplicationBoard.jsx')
  const rows = [
    {
      slug: 'medical-ai',
      label: 'Medical AI Lead',
      archetype: 'Medical AI',
      nextAction: 'Review evidence',
      status: 'generated',
      pdfPath: '/generated-resumes/medical-ai.pdf',
    },
  ]
  const tree = ApplicationBoard({ rows, selectedSlug: 'medical-ai', onSelect: () => {}, onUpdate: () => {} })
  const links = findElements(tree, (node) => node.type === 'a')

  assert.equal(links.length, 1)
  assert.equal(links[0].props.href, '/generated-resumes/medical-ai.pdf')
  assert.equal(links[0].props.target, '_blank')
  assert.match(links[0].props.rel, /noreferrer/)
})

test('EvidenceReview keeps markdown formatting but does not render raw HTML from evaluation markdown', async () => {
  const { default: EvidenceReview } = await importJsxModule('src/career/EvidenceReview.jsx')
  const tree = EvidenceReview({
    version: {
      evaluationMarkdown:
        '# Summary\n\n[Safe link](https://example.com)\n\n[Jump link](#evidence)\n\n' +
        '[Bad link](javascript:alert(1))\n\n![Bad image](javascript:alert(2))\n\n' +
        '<script>alert("xss")</script>\n\n- evidence item\n\n<img src=x onerror="alert(1)">',
      metadata: {},
    },
  })
  const [htmlBlock] = findElements(tree, (node) => typeof node.props?.dangerouslySetInnerHTML?.__html === 'string')
  const html = htmlBlock.props.dangerouslySetInnerHTML.__html

  assert.match(html, /<h1/i)
  assert.match(html, /<li>evidence item<\/li>/i)
  assert.match(html, /href="https:\/\/example\.com"/i)
  assert.match(html, /href="#evidence"/i)
  assert.doesNotMatch(html, /href="javascript:/i)
  assert.doesNotMatch(html, /src="javascript:/i)
  assert.doesNotMatch(html, /<script/i)
  assert.doesNotMatch(html, /<img/i)
  assert.match(html, /&lt;script&gt;alert\(&quot;xss&quot;\)&lt;\/script&gt;/i)
  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/i)
})
