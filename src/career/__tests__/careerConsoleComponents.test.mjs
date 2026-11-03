import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

test('job PDF artifacts survive missing or stale manifest rows', async () => {
  const { mergeCareerRows, JobsPanel } = await importJsxModule('src/career/CareerConsole.jsx')
  const job = { id: 'job-pdf', slug: 'clinical-ai', roleTitle: 'Clinical AI Lead', stage: 'apply_pack', status: 'generated', hasPdf: true, pdfPath: '/api/career/pdf/clinical-ai.pdf' }
  const rows = mergeCareerRows([], [job])
  assert.equal(rows[0].hasPdf, true)
  assert.equal(rows[0].pdfPath, job.pdfPath)
  assert.equal(rows.filter((row) => row.hasPdf).length, 1)
  const html = renderToStaticMarkup(React.createElement(JobsPanel, { rows, loading: false, loadError: '', selected: null, selectedSlug: '', onSelect: () => {}, onUpdate: () => {} }))
  assert.match(html, /\/api\/career\/pdf\/clinical-ai.pdf/)
  const stale = mergeCareerRows([{ slug: job.slug, hasPdf: false, pdfPath: '' }], [job])
  assert.equal(stale[0].hasPdf, true)
  assert.equal(stale[0].pdfPath, job.pdfPath)
  const legacy = mergeCareerRows([{ slug: job.slug, hasPdf: true, pdfPath: '/legacy.pdf' }], [{ ...job, hasPdf: undefined, pdfPath: undefined }])
  assert.equal(legacy[0].pdfPath, '/legacy.pdf')
})

test('JD workflow requires explicit saved source and does not offer an implicit master', async () => {
  const { default: Intake } = await importJsxModule('src/career/JdIntakeHelper.jsx')
  const html = renderToStaticMarkup(React.createElement(Intake))
  assert.match(html, /Select a saved resume/)
  assert.match(html, /Select a source resume/)
  assert.match(html, /disabled=""[^>]*>.*?Run local workflow/s)
  assert.doesNotMatch(html, /Xiaolei/)
})

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

test('loadCareerConsoleState preserves Jobs when Agent Runs are temporarily unavailable', async () => {
  const module = await importJsxModule('src/career/CareerConsole.jsx')
  const versions = [{ slug: 'sample-role' }]
  const jobs = [{ id: 'job-1', slug: 'sample-role' }]
  const result = await module.loadCareerConsoleState(
    async () => versions,
    async () => jobs,
    async () => { throw new Error('runtime offline') },
  )

  assert.deepEqual(result.careerVersions, versions)
  assert.deepEqual(result.careerJobs, jobs)
  assert.deepEqual(result.careerRuns, [])
  assert.equal(result.loadError, '')
})

test('CareerConsole renders the approved five-area navigation', async () => {
  const { default: CareerConsole } = await importJsxModule('src/career/CareerConsole.jsx')
  const html = renderToStaticMarkup(React.createElement(CareerConsole))

  assert.match(html, /New Job/)
  assert.match(html, /Opportunities/)
  assert.match(html, /Jobs/)
  assert.match(html, /Agent Runs/)
  assert.match(html, /Interview/)
  assert.doesNotMatch(html, />Score</)
  assert.doesNotMatch(html, />Prompts</)
})

test('CareerConsole starts a new Job with intake before review and optional Portfolio Studio', async () => {
  const { default: CareerConsole } = await importJsxModule('src/career/CareerConsole.jsx')
  const html = renderToStaticMarkup(React.createElement(CareerConsole))

  const intakeIndex = html.indexOf('JD Workflow')
  const evidenceIndex = html.indexOf('Evidence Review')
  const applyPackIndex = html.indexOf('Manual Apply Pack')
  const portfolioIndex = html.indexOf('Portfolio Studio')

  assert.ok(intakeIndex >= 0)
  assert.ok(intakeIndex < evidenceIndex)
  assert.ok(evidenceIndex < applyPackIndex)
  assert.ok(applyPackIndex < portfolioIndex)
  assert.match(html, /Optional resume evidence workspace/)
  assert.doesNotMatch(html, /JD\/CV Match Score/)
  assert.doesNotMatch(html, /Application Agent/)
  assert.doesNotMatch(html, /Generated versions/)
})

test('JobsPanel manages existing jobs without duplicating JD Workflow', async () => {
  const { JobsPanel } = await importJsxModule('src/career/CareerConsole.jsx')
  const html = renderToStaticMarkup(React.createElement(JobsPanel, {
    rows: [],
    loading: false,
    loadError: '',
    selected: null,
    selectedSlug: '',
    onSelect: () => {},
    onUpdate: () => {},
  }))

  assert.match(html, /Job portfolio/)
  assert.doesNotMatch(html, /JD Workflow/)
  assert.doesNotMatch(html, /Run local workflow/)
})

test('AgentRunsPanel renders persisted workflow events beside optional agent tools', async () => {
  const { AgentRunsPanel } = await importJsxModule('src/career/CareerConsole.jsx')
  const html = renderToStaticMarkup(React.createElement(AgentRunsPanel, {
    runs: [{
      id: 'run-001',
      company: 'Varian',
      roleTitle: 'Product Lead',
      status: 'complete',
      stage: 'apply_pack',
      events: [{ id: 'event-001', label: 'Resume adapt', detail: 'Generated resume', type: 'workflow.step' }],
    }],
    selected: null,
  }))

  assert.match(html, /Local workflow history/)
  assert.match(html, /Varian - Product Lead/)
  assert.match(html, /Resume adapt/)
  assert.match(html, /Generated resume/)
  assert.match(html, /Career agent skills/)
})

test('AgentSkillsPanel lists local career skills and LinkedIn MCP capabilities', async () => {
  const { AgentSkillsPanel } = await importJsxModule('src/career/CareerConsole.jsx')
  const html = renderToStaticMarkup(React.createElement(AgentSkillsPanel, { initiallyOpen: true }))

  assert.match(html, /Career agent skills/)
  assert.match(html, /Skills enabled/)
  assert.match(html, /agent-browser/)
  assert.match(html, /resume-polish-enhanced/)
  assert.match(html, /stickerdaniel\/linkedin-mcp-server/)
  assert.match(html, /get_company_profile/)
  assert.match(html, /get_company_posts/)
  assert.match(html, /search_jobs/)
  assert.match(html, /search_people/)
  assert.match(html, /get_job_details/)
})

test('AgentSkillsPanel keeps skills collapsed until enabled', async () => {
  const { AgentSkillsPanel } = await importJsxModule('src/career/CareerConsole.jsx')
  const html = renderToStaticMarkup(React.createElement(AgentSkillsPanel))

  assert.match(html, /Career agent skills/)
  assert.match(html, /Optional boosters/)
  assert.match(html, /Skills disabled/)
  assert.match(html, /Enable/)
  assert.doesNotMatch(html, /agent-browser/)
  assert.doesNotMatch(html, /stickerdaniel\/linkedin-mcp-server/)
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

test('ResumeWorkbench renders editable resume modules and export controls', async () => {
  const { default: ResumeWorkbench } = await importJsxModule('src/career/ResumeWorkbench.jsx')
  const html = renderToStaticMarkup(
    React.createElement(ResumeWorkbench, {
      baseResume: {
        education: [{ degree: 'PhD', institution: 'CAS' }],
        work: [{ title: 'Senior Application Manager', company: 'Bayer', details: ['Built clinical AI tools.'] }],
        skills: ['Medical AI'],
        certificates: [],
        projects: [{ title: 'Existing Project', description: 'Existing.' }],
        publications: [],
        posters: [],
        patents: [],
      },
    }),
  )

  assert.match(html, /Resume WYSIWYG Workbench/)
  assert.match(html, /Education/)
  assert.match(html, /Work Experience/)
  assert.match(html, /Save local draft/)
  assert.match(html, /Download PDF/)
})

test('ResumeWorkbench applies a Portfolio Studio draft into the editable resume canvas', async () => {
  const { default: ResumeWorkbench } = await importJsxModule('src/career/ResumeWorkbench.jsx')
  const { buildPortfolioDraft } = await importJsxModule('src/career/portfolioDrafts.js')
  const draft = buildPortfolioDraft({
    title: 'Radiology RAG Enablement',
    projectType: 'llm-rag',
    imagePath: '/images/projects/project-24.jpg',
    rawText: 'Built a RAG workflow for radiology product education.',
  })
  const { render } = renderWithHookDispatcher(ResumeWorkbench, {
    baseResume: {
      education: [],
      work: [],
      skills: ['Medical AI'],
      certificates: [],
      projects: [],
      publications: [],
      posters: [],
      patents: [],
    },
    portfolioDraft: draft,
  })

  let tree = render()
  const applyProjectButton = findElements(tree, (node) => node.type === 'button' && textContent(node.props.children).includes('Apply generated project'))[0]
  const applySkillsButton = findElements(tree, (node) => node.type === 'button' && textContent(node.props.children).includes('Apply suggested skills'))[0]

  assert.ok(applyProjectButton)
  assert.equal(applyProjectButton.props.draggable, true)
  applyProjectButton.props.onClick()
  applySkillsButton.props.onClick()

  tree = render()
  const renderedText = textContent(tree)
  assert.match(renderedText, /Radiology RAG Enablement/)
  assert.match(renderedText, /RAG/)
})

test('CareerConsole renders a career-ops center without embedding the resume workbench', async () => {
  const { default: CareerConsole } = await importJsxModule('src/career/CareerConsole.jsx')
  const html = renderToStaticMarkup(React.createElement(CareerConsole))

  assert.doesNotMatch(html, /Resume WYSIWYG Workbench/)
  assert.doesNotMatch(html, /Download PDF/)
  assert.match(html, /Career-Ops Center/)
  assert.match(html, /Portfolio Studio/)
  assert.match(html, /Evidence Review/)
  assert.match(html, /Manual Apply Pack/)
  assert.match(html, /JD Workflow/)
  assert.match(html, /Resume home/)
  assert.doesNotMatch(html, /JD\/CV Match Score/)
  assert.doesNotMatch(html, /Application Agent/)
  assert.match(
    html,
    /Evidence Review will populate after this JD-specific version exists/i,
  )
})

test('CareerConsole score tab renders six rubric dimensions and a 4.0 apply gate', async () => {
  const { ScoreRubricPanel } = await importJsxModule('src/career/CareerConsole.jsx')
  const html = renderToStaticMarkup(React.createElement(ScoreRubricPanel))

  assert.match(html, /JD\/CV Match Score/)
  assert.match(html, /4\.0 apply gate/)
  assert.match(html, /医疗行业匹配度/)
  assert.match(html, /岗位类型匹配度/)
  assert.match(html, /证据强度/)
  assert.match(html, /量化影响/)
  assert.match(html, /关键词\/ATS 对齐/)
  assert.match(html, /风险与缺口/)
})

test('ApplicationAgentPanel toggles Agent Active state and exposes a local task log', async () => {
  const { default: ApplicationAgentPanel } = await importJsxModule('src/career/ApplicationAgentPanel.jsx')
  const { render } = renderWithHookDispatcher(ApplicationAgentPanel, { selectedSlug: 'medical-ai-lead' })

  let tree = render()
  const toggle = findElements(tree, (node) => node.type === 'button' && textContent(node.props.children).includes('Agent Active'))[0]

  assert.ok(toggle)
  assert.match(textContent(tree), /Manual mode/)
  toggle.props.onClick()

  tree = render()
  const renderedText = textContent(tree)
  assert.match(renderedText, /Agent Active/)
  assert.match(renderedText, /Live local log/)
  assert.match(renderedText, /Scan job page/)
  assert.match(renderedText, /Pause before final submit/)
})

test('ApplicationAgentPanel models browser automation as a human-confirmed local workflow', async () => {
  const { default: ApplicationAgentPanel } = await importJsxModule('src/career/ApplicationAgentPanel.jsx')
  const html = renderToStaticMarkup(React.createElement(ApplicationAgentPanel, { selectedSlug: 'medical-ai-lead' }))

  assert.match(html, /Application Agent/)
  assert.match(html, /Job link/)
  assert.match(html, /Scan job page/)
  assert.match(html, /Map application fields/)
  assert.match(html, /Attach resume PDF/)
  assert.match(html, /Human confirmation/)
  assert.match(html, /No final submission without confirmation/)
})

test('Interview role-play derives a medical interview plan from JD and LinkedIn context', async () => {
  const { buildInterviewBrief, buildRolePlayReply } = await importJsxModule('src/career/interviewRolePlayState.js')
  const brief = buildInterviewBrief({
    jdText: 'Medical AI Product Lead. Own hospital adoption, clinical evidence, and digital platform scale-up.',
    interviewerLinkedIn: 'Name: Dr. Mei Lin\nVP Clinical Innovation | Digital Health | Hospital partnerships',
  })
  const reply = buildRolePlayReply({
    brief,
    answer: 'I aligned clinical, commercial, and engineering teams to improve hospital workflow adoption by 25%.',
  })

  assert.equal(brief.interviewer.name, 'Dr. Mei Lin')
  assert.match(brief.interviewer.focus.join(' '), /clinical adoption/i)
  assert.match(brief.interviewer.focus.join(' '), /digital product/i)
  assert.ok(brief.likelyQuestions.length >= 3)
  assert.match(brief.prompt, /one question at a time/i)
  assert.match(reply.coaching, /measurable outcome/i)
  assert.match(reply.followUp, /trade-off/i)
})

test('Interview role-play respects session settings and produces a transcript-grounded debrief', async () => {
  const { buildInterviewBrief, buildInterviewDebrief, buildRolePlayReply } = await importJsxModule('src/career/interviewRolePlayState.js')
  const brief = buildInterviewBrief({
    jdText: 'Medical Digital Product Lead. Improve clinical workflow adoption.',
    interviewerLinkedIn: 'Name: Dr. Mei Lin\nClinical Innovation Director',
    interviewType: 'stakeholder',
    pressure: 'challenging',
    questionCount: '3',
    includeCurveballs: false,
  })
  const firstReply = buildRolePlayReply({
    brief,
    answer: 'I aligned hospital, commercial, and engineering partners around a 25% workflow adoption increase.',
    turn: 0,
  })
  const finalReply = buildRolePlayReply({
    brief,
    answer: 'I used clinical evidence, a risk review, and customer feedback to decide the next release.',
    turn: 2,
  })
  const challengingReply = buildRolePlayReply({
    brief,
    answer: 'I would make the decision transparent and align all partners on the evidence.',
    turn: 1,
  })
  const debrief = buildInterviewDebrief({
    brief,
    messages: [
      { role: 'candidate', assessment: firstReply.assessment },
      { role: 'candidate', assessment: finalReply.assessment },
    ],
  })

  assert.equal(brief.settings.interviewType, 'stakeholder')
  assert.equal(brief.settings.pressure, 'challenging')
  assert.equal(brief.settings.questionCount, 3)
  assert.equal(brief.likelyQuestions.length, 3)
  assert.match(brief.likelyQuestions[0], /clinical leader/i)
  assert.match(challengingReply.followUp, /be specific/i)
  assert.equal(finalReply.complete, true)
  assert.equal(debrief.answered, 2)
  assert.ok(debrief.overall > 0)
  assert.match(debrief.priority, /Add a specific|Use a tighter|Reconnect/i)
})

test('InterviewRolePlay renders the local-first preparation flow and role-play controls', async () => {
  const { default: InterviewRolePlay } = await importJsxModule('src/career/InterviewRolePlay.jsx')
  const html = renderToStaticMarkup(React.createElement(InterviewRolePlay))

  assert.match(html, /Interview role-play/)
  assert.match(html, /Job description/)
  assert.match(html, /Interviewer LinkedIn notes/)
  assert.match(html, /Build interview plan/)
  assert.match(html, /Local-first/)
})

test('JdIntakeHelper starts a new job cleanly and keeps recovery commands unavailable before JD intake', async () => {
  const { default: JdIntakeHelper } = await importJsxModule('src/career/JdIntakeHelper.jsx')
  const html = renderToStaticMarkup(React.createElement(JdIntakeHelper, { selectedSlug: 'medical-ai-lead' }))

  assert.match(html, /JD Workflow/)
  assert.match(html, /Visual workflow/)
  assert.match(html, /Run local workflow/)
  assert.match(html, /Resume adapt/)
  assert.match(html, /PDF render/)
  assert.match(html, /Manifest refresh/)
  assert.match(html, /Start new job/)
  assert.match(html, /Job source link/)
  assert.match(html, /career\/jds\/new-role-slug.md/)
  assert.match(html, /Run the workflow once first/)
  assert.match(html, /cannot fail with ENOENT/i)
  assert.doesNotMatch(html, /Manual command step/)
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

test('PortfolioStudio exposes generated draft actions for applying project and skills to the editor', async () => {
  const { default: PortfolioStudio } = await importJsxModule('src/career/PortfolioStudio.jsx')
  const applied = []
  const { render } = renderWithHookDispatcher(PortfolioStudio, {
    onDraftChange: () => {},
    onApplyProject: (draft) => applied.push(['project', draft.webProject.title]),
    onApplySkills: (draft) => applied.push(['skills', draft.skillSuggestions.length]),
  })

  let tree = render()
  findElements(tree, (node) => node.type === 'input' && node.props?.placeholder === 'Radiology RAG Enablement')[0].props.onChange({
    target: { value: 'Radiology RAG Enablement' },
  })
  findElements(
    tree,
    (node) => node.type === 'textarea' && node.props?.placeholder === 'What you built, medical context, users, workflow, tools, outcomes, and proof.',
  )[0].props.onChange({ target: { value: 'Built a RAG workflow for imaging notes.' } })

  tree = render()
  findElements(tree, (node) => node.type === 'button' && textContent(node.props.children).includes('Generate draft'))[0].props.onClick()

  tree = render()
  findElements(tree, (node) => node.type === 'button' && textContent(node.props.children).includes('Apply project to resume'))[0].props.onClick()
  findElements(tree, (node) => node.type === 'button' && textContent(node.props.children).includes('Apply skills to resume'))[0].props.onClick()

  assert.equal(applied[0][0], 'project')
  assert.equal(applied[0][1], 'Radiology RAG Enablement')
  assert.equal(applied[1][0], 'skills')
  assert.ok(applied[1][1] > 0)
  assert.ok(findElements(tree, (node) => node.type === 'details' && textContent(node.props.children).includes('Review payload')).length)
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
