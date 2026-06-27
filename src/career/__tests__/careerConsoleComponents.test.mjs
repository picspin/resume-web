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

function textContent(value) {
  if (Array.isArray(value)) {
    return value.map(textContent).join('')
  }
  if (!value || typeof value === 'boolean') {
    return ''
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }
  return textContent(value.props?.children)
}

function renderWithHookDispatcher(Component, props = {}) {
  const internals = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
  const dispatcherRef = internals.ReactCurrentDispatcher
  const hookState = []
  const effectDeps = []

  const render = () => {
    let hookIndex = 0
    const dispatcher = {
      useState(initialValue) {
        const index = hookIndex++
        if (!(index in hookState)) {
          hookState[index] = typeof initialValue === 'function' ? initialValue() : initialValue
        }

        const setState = (nextValue) => {
          hookState[index] = typeof nextValue === 'function' ? nextValue(hookState[index]) : nextValue
        }

        return [hookState[index], setState]
      },
      useMemo(factory) {
        hookIndex++
        return factory()
      },
      useEffect(effect, deps) {
        hookIndex++
        effectDeps.push(deps)
      },
      useCallback(callback) {
        hookIndex++
        return callback
      },
      useRef(initialValue) {
        hookIndex++
        return { current: initialValue }
      },
      useContext(context) {
        hookIndex++
        return context._currentValue
      },
      useReducer(reducer, initialArg, init) {
        const index = hookIndex++
        if (!(index in hookState)) {
          hookState[index] = typeof init === 'function' ? init(initialArg) : initialArg
        }

        const dispatch = (action) => {
          hookState[index] = reducer(hookState[index], action)
        }

        return [hookState[index], dispatch]
      },
      useLayoutEffect() {
        hookIndex++
      },
      useInsertionEffect() {
        hookIndex++
      },
      useImperativeHandle() {
        hookIndex++
      },
      useDeferredValue(value) {
        hookIndex++
        return value
      },
      useTransition() {
        hookIndex++
        return [false, () => {}]
      },
      useId() {
        hookIndex++
        return `test-id-${hookIndex}`
      },
      useSyncExternalStore(subscribe, getSnapshot) {
        hookIndex++
        return getSnapshot()
      },
    }

    const previousDispatcher = dispatcherRef.current
    dispatcherRef.current = dispatcher
    try {
      return Component(props)
    } finally {
      dispatcherRef.current = previousDispatcher
    }
  }

  return { render, effectDeps }
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

test('ResumePreview renders draft bullets and resume layout sections', async () => {
  const { default: ResumePreview } = await importJsxModule('src/career/ResumePreview.jsx')
  const preview = {
    resume: {
      education: [],
      work: [],
      skills: ['Medical AI & Digital Health: LLM/RAG workflow design.'],
      certificates: [],
      projects: [{ title: 'Radiology RAG Enablement', description: 'Solution owner.', image: '/images/projects/project-1.jpg' }],
      publications: [],
      posters: [],
      patents: [],
    },
    metadata: {
      resumeBullets: ['Radiology RAG Enablement: Solution owner.'],
      warnings: [],
      reviewOnly: true,
    },
  }
  const html = renderToStaticMarkup(React.createElement(ResumePreview, { preview }))

  assert.match(html, /Resume Preview/)
  assert.match(html, /Radiology RAG Enablement/)
  assert.match(html, /Draft bullets/)
})

test('CareerConsole renders the resume preview workspace', async () => {
  const { default: CareerConsole } = await importJsxModule('src/career/CareerConsole.jsx')
  const html = renderToStaticMarkup(React.createElement(CareerConsole))

  assert.match(html, /Resume Preview/)
  assert.match(html, /Generate a portfolio draft to preview it in the live resume layout/)
})

test('PortfolioStudio calls onDraftChange when generating and clearing a draft', async () => {
  const { default: PortfolioStudio } = await importJsxModule('src/career/PortfolioStudio.jsx')
  const changes = []
  const onDraftChange = (draft) => {
    changes.push(draft)
  }
  const { render } = renderWithHookDispatcher(PortfolioStudio, { onDraftChange })

  let tree = render()
  const titleInput = findElements(tree, (node) => node.type === 'input' && node.props?.placeholder === 'Radiology RAG Enablement')[0]
  const rawEvidenceInput = findElements(
    tree,
    (node) => node.type === 'textarea' && node.props?.placeholder === 'What you built, medical context, users, workflow, tools, outcomes, and proof.',
  )[0]

  titleInput.props.onChange({ target: { value: 'Radiology RAG Enablement' } })
  rawEvidenceInput.props.onChange({ target: { value: 'Built a RAG workflow for imaging notes.' } })

  tree = render()
  const generateButton = findElements(tree, (node) => node.type === 'button' && textContent(node.props.children).includes('Generate draft'))[0]
  const clearButton = findElements(tree, (node) => node.type === 'button' && textContent(node.props.children) === 'Clear')[0]

  generateButton.props.onClick()
  assert.equal(changes.length, 1)
  assert.equal(changes[0].input.title, 'Radiology RAG Enablement')
  assert.match(changes[0].input.rawText, /imaging notes/)

  clearButton.props.onClick()
  assert.equal(changes.length, 2)
  assert.equal(changes[1], null)
})

test('PortfolioStudio keeps the default onDraftChange dependency stable across renders', async () => {
  const { default: PortfolioStudio } = await importJsxModule('src/career/PortfolioStudio.jsx')
  const { render, effectDeps } = renderWithHookDispatcher(PortfolioStudio)

  render()
  render()

  assert.equal(effectDeps.length >= 2, true)
  assert.strictEqual(effectDeps[0][0], effectDeps[1][0])
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

test('CareerEntry links the local homepage to the Career Console', async () => {
  const { default: CareerEntry } = await importJsxModule('src/career/CareerEntry.jsx')
  const tree = CareerEntry()
  const links = findElements(tree, (node) => node.type === 'a')

  assert.equal(links.length, 1)
  assert.equal(links[0].props.href, '/career')
  assert.match(String(links[0].props.children), /Career Console/)
})
