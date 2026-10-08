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
    `editable-resume-${path.basename(relativePath, path.extname(relativePath))}-${Date.now()}-${Math.random().toString(16).slice(2)}.mjs`,
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
      useEffect() {
        hookIndex++
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

  return { render }
}

const sampleResume = {
  education: [{ degree: 'PhD', major: 'Biochemistry', institution: 'CAS', date: '2018', year: '2018' }],
  work: [{ title: 'Application Manager', company: 'Bayer', location: 'Guangzhou', date: '2022-2024', details: ['Built medical AI workflows.'] }],
  skills: ['Medical AI & Digital Health'],
  certificates: [{ title: 'PMP', organization: 'PMI', date: '2023' }],
  projects: [{ title: 'Radiology RAG Enablement', description: 'Solution owner.', image: '/images/projects/project-24.jpg' }],
  publications: [{ title: 'Clinical AI Paper', journal: 'Journal' }],
  posters: [{ title: 'Digital Health Poster', authors: 'Zhu', event: 'Conference' }],
  patents: [{ title: 'Medical workflow patent', authors: 'Zhu' }],
}

test('EditableResumeShell keeps the resume clean when edit mode is off', async () => {
  const { default: EditableResumeShell } = await importJsxModule('src/components/EditableResumeShell.jsx')
  const html = renderToStaticMarkup(React.createElement(EditableResumeShell, { data: sampleResume, initiallyEditing: false }))

  assert.match(html, /Education/)
  assert.match(html, /Projects &amp; Achievements/)
  assert.doesNotMatch(html, /Module editor/)
  assert.doesNotMatch(html, /Edit module/)
  assert.doesNotMatch(html, /data-editable-section/)
})

test('EditableResumeShell enables selectable module chrome and a targeted drawer in edit mode', async () => {
  const { default: EditableResumeShell } = await importJsxModule('src/components/EditableResumeShell.jsx')
  const html = renderToStaticMarkup(
    React.createElement(EditableResumeShell, {
      data: sampleResume,
      initiallyEditing: true,
      initiallySelectedSection: 'work',
    }),
  )

  assert.match(html, /data-editable-section="work"/)
  assert.equal((html.match(/aria-label="Edit module:/g) || []).length, 9)
  assert.match(html, /Drag handle/)
  assert.match(html, /Module editor/)
  assert.match(html, /Work Experience/)
  assert.match(html, /draggable="true"/)
  assert.doesNotMatch(html, /Education editor/)
})

test('ModuleEditDrawer exposes module-specific fields and functional entry controls', async () => {
  const { ModuleEditDrawer } = await importJsxModule('src/components/EditableResumeShell.jsx')
  const workHtml = renderToStaticMarkup(React.createElement(ModuleEditDrawer, { sectionKey: 'work', data: sampleResume, onClose: () => {} }))
  const educationHtml = renderToStaticMarkup(React.createElement(ModuleEditDrawer, { sectionKey: 'education', data: sampleResume, onClose: () => {} }))

  assert.match(workHtml, /resume-work-0-details/)
  assert.match(workHtml, /Duplicate entry 1/)
  assert.match(workHtml, /Export PDF/)
  assert.doesNotMatch(educationHtml, /AI optimization/)
  assert.match(educationHtml, /resume-education-0-degree/)
})

test('EditableResumeShell drawer edits update the rendered web resume before PDF export', async () => {
  const { default: EditableResumeShell } = await importJsxModule('src/components/EditableResumeShell.jsx')
  const { render } = renderWithHookDispatcher(EditableResumeShell, {
    data: sampleResume,
    initiallyEditing: true,
    initiallySelectedSection: 'work',
  })

  let tree = render()
  const drawer = findElements(tree, (node) => node.type?.name === 'ModuleEditDrawer')[0]

  assert.ok(drawer)
  drawer.props.onUpdateField(0, 'title', 'Medical AI Portfolio Lead')

  tree = render()
  const resumeSection = findElements(tree, (node) => node.type?.name === 'ResumeSection')[0]
  assert.equal(resumeSection.props.data.work[0].title, 'Medical AI Portfolio Lead')
  assert.notEqual(resumeSection.props.data.work[0].title, 'Application Manager')
})

test('EditableResumeShell selects all document themes from the toolbar', async () => {
  const { default: EditableResumeShell } = await importJsxModule('src/components/EditableResumeShell.jsx')
  const { render } = renderWithHookDispatcher(EditableResumeShell, { data: sampleResume })

  let tree = render()
  const themeButton = findElements(tree, (node) => node.type === 'select' && node.props['aria-label'] === 'Resume theme')[0]

  assert.ok(themeButton)
  assert.match(tree.props.className, /resume-theme-default/)
  assert.equal(textContent(themeButton.props.children), 'defaultnordmonokaigithub')
  themeButton.props.onChange({ target: { value: 'nord' } })

  tree = render()
  assert.match(tree.props.className, /resume-theme-nord/)
})

test('Header can hide the top PDF button when the editor toolbar owns export', async () => {
  const { default: Header } = await importJsxModule('src/components/Header.jsx')
  const html = renderToStaticMarkup(
    React.createElement(Header, {
      lang: 'en',
      setLang: () => {},
      dark: false,
      setDark: () => {},
      onDownload: () => {},
      showDownload: false,
    }),
  )

  assert.doesNotMatch(html, /Download PDF/)
  assert.doesNotMatch(html, />PDF</)
})

test('controlled documents render profile, custom section titles and summary and suppress hidden modules', async () => {
  const { default: Shell } = await importJsxModule('src/components/EditableResumeShell.jsx')
  const document = { id: 'architect', theme: 'nord', sectionOrder: ['summary', 'work'], hiddenSections: ['education'], resume: { ...sampleResume, general: { name: 'Synthetic Architect', headline: 'Landscape Architect', email_private: 'test@example.invalid' }, summary: 'Designed public gardens.', sectionTitles: { work: 'Selected Practice' } } }
  const html = renderToStaticMarkup(React.createElement(Shell, { document, showProfile: true, canEdit: false }))
  assert.match(html, /Synthetic Architect/)
  assert.match(html, /Landscape Architect/)
  assert.match(html, /test@example.invalid/)
  assert.match(html, /Designed public gardens/)
  assert.match(html, /Selected Practice/)
  assert.doesNotMatch(html, /Biochemistry|Edit mode|Save draft|Sync|resume-editor-toolbar/)
  assert.ok(html.indexOf('Designed public gardens') < html.indexOf('Selected Practice'))
})

test('field edits propagate a new controlled document without mutating source', async () => {
  const { default: Shell } = await importJsxModule('src/components/EditableResumeShell.jsx')
  const document = { id: 'a', theme: 'default', sectionOrder: ['work'], hiddenSections: [], resume: structuredClone(sampleResume) }
  let updated
  const { render } = renderWithHookDispatcher(Shell, { document, onChange: value => { updated = value }, initiallyEditing: true, initiallySelectedSection: 'work' })
  const drawer = findElements(render(), node => node.type?.name === 'ModuleEditDrawer')[0]
  drawer.props.onUpdateField(0, 'title', 'Architect')
  assert.equal(updated.id, 'a')
  assert.equal(updated.resume.work[0].title, 'Architect')
  assert.equal(document.resume.work[0].title, 'Application Manager')
})

test('project image clearing removes numbered fallback provenance', async () => {
  const { default: Shell } = await importJsxModule('src/components/EditableResumeShell.jsx')
  const document = { id: 'a', theme: 'default', sectionOrder: ['projects'], hiddenSections: [], resume: { ...sampleResume, projects: [{ title: 'Project', image: '/images/projects/image.png', projectNumber: 1 }] } }
  let updated
  const { render } = renderWithHookDispatcher(Shell, { document, onChange: value => { updated = value }, initiallyEditing: true, initiallySelectedSection: 'projects' })
  findElements(render(), node => node.type?.name === 'ModuleEditDrawer')[0].props.onUpdateField(0, 'image', '')
  assert.equal(updated.resume.projects[0].image, '')
  assert.equal(updated.resume.projects[0].projectNumber, undefined)
})

test('module rendering escapes user HTML and includes publication authors and poster events', async () => {
  const { default: Section } = await importJsxModule('src/components/ResumeSection.jsx')
  const html = renderToStaticMarkup(React.createElement(Section, { data: { ...sampleResume, work: [{ title: '<script>bad()</script>', details: ['<img src=x onerror=bad()>'] }], publications: [{ title: 'Paper', authors: 'A. Researcher', type: 'Journal', journal: 'Nature' }] } }))
  assert.doesNotMatch(html, /<script>|<img src="x"/)
  assert.match(html, /&lt;script&gt;/)
  assert.match(html, /A. Researcher/)
  assert.match(html, /Conference/)
  assert.match(html, /PMI/)
})
