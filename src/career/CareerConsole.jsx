import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bot,
  Briefcase,
  Building2,
  ClipboardList,
  FileText,
  Home,
  MessagesSquare,
  PlugZap,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import { loadCareerJobs, loadCareerRuns, loadCareerVersions } from './careerData'
import { deriveCareerRows } from './careerRows'
import { useApplicationState } from './useApplicationState'
import ApplicationBoard from './ApplicationBoard'
import ApplicationAgentPanel from './ApplicationAgentPanel'
import EvidenceReview from './EvidenceReview'
import ApplyPack from './ApplyPack'
import JdIntakeHelper from './JdIntakeHelper'
import PortfolioStudio from './PortfolioStudio'
import InterviewRolePlay from './InterviewRolePlay'

const CONSOLE_TABS = [
  { key: 'new-job', label: 'New Job', icon: Sparkles },
  { key: 'opportunities', label: 'Opportunities', icon: Search },
  { key: 'jobs', label: 'Jobs', icon: Briefcase },
  { key: 'runs', label: 'Agent Runs', icon: Bot },
  { key: 'interview', label: 'Interview', icon: MessagesSquare },
]

const SCORE_RUBRIC = [
  { label: '医疗行业匹配度', value: 4.2, note: 'Medical, pharma, device, and digital health language is present.' },
  { label: '岗位类型匹配度', value: 3.9, note: 'Tune the version toward product, BD, clinical solution, or device R&D.' },
  { label: '证据强度', value: 4.1, note: 'Use projects, publications, and Bayer rotations as proof points.' },
  { label: '量化影响', value: 3.6, note: 'Add business, launch, adoption, or workflow metrics before applying.' },
  { label: '关键词/ATS 对齐', value: 4.0, note: 'Mirror JD terms without changing the truth of the resume.' },
  { label: '风险与缺口', value: 3.7, note: 'Flag claims that need evidence or a softer formulation.' },
]

export function ScoreRubricPanel({ rubric = SCORE_RUBRIC }) {
  const average = rubric.reduce((total, item) => total + item.value, 0) / Math.max(rubric.length, 1)
  const ready = average >= 4

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-teal-700">JD/CV Match Score</p>
          <h2 className="mt-1 text-lg font-semibold">Six-dimension application gate</h2>
          <p className="mt-2 text-sm text-gray-600">
            Score each JD against the current CV from 1.0 to 5.0. Use the 4.0 apply gate to decide whether to apply or iterate first.
          </p>
        </div>
        <div className={`rounded-md px-3 py-2 text-sm font-semibold ${ready ? 'bg-teal-50 text-teal-800' : 'bg-amber-50 text-amber-800'}`}>
          {average.toFixed(1)} / 5.0 · 4.0 apply gate
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {rubric.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-gray-900">{item.label}</span>
              <span className="text-gray-600">{item.value.toFixed(1)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-teal-700" style={{ width: `${Math.min(100, Math.max(0, (item.value / 5) * 100))}%` }} />
            </div>
            <p className="mt-1 text-xs text-gray-500">{item.note}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-md border border-dashed border-teal-300 bg-teal-50 p-3 text-sm text-teal-900">
        Iteration prompt: identify weak rubric dimensions, rewrite only the relevant module, and preserve evidence-backed claims.
      </div>
    </section>
  )
}

export function PromptsPanel() {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <p className="text-sm font-medium text-teal-700">Prompts</p>
      <h2 className="mt-1 text-lg font-semibold">HR-facing iteration prompts</h2>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {[
          'Rewrite the selected project for a medical device product role with evidence, scope, and measurable impact.',
          'Extract JD keywords and map them to truthful resume bullets across Work, Projects, and Skills.',
          'Identify risk claims that need proof before application and suggest softer wording.',
          'Generate a concise HR message that explains why this medical digital background fits the role.',
        ].map((prompt) => (
          <article key={prompt} className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
            {prompt}
          </article>
        ))}
      </div>
    </section>
  )
}

function SummaryCards({ rows = [] }) {
  return (
    <section className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <ClipboardList className="mb-2 h-5 w-5 text-teal-700" />
        <div className="text-2xl font-semibold">{rows.length}</div>
        <div className="text-sm text-gray-600">Generated versions</div>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <FileText className="mb-2 h-5 w-5 text-teal-700" />
        <div className="text-2xl font-semibold">{rows.filter((row) => row.hasPdf).length}</div>
        <div className="text-sm text-gray-600">PDF ready</div>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <Send className="mb-2 h-5 w-5 text-teal-700" />
        <div className="text-2xl font-semibold">{rows.filter((row) => row.status === 'applied').length}</div>
        <div className="text-sm text-gray-600">Applied</div>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <ShieldCheck className="mb-2 h-5 w-5 text-teal-700" />
        <div className="text-2xl font-semibold">Manual</div>
        <div className="text-sm text-gray-600">Submit gate</div>
      </div>
    </section>
  )
}

export function AgentSkillsPanel({ initiallyOpen = false }) {
  const [open, setOpen] = useState(initiallyOpen)
  const localSkills = [
    {
      name: 'agent-browser',
      icon: Search,
      text: 'Open career pages, inspect forms, upload prepared files, and pause before final submission.',
    },
    {
      name: 'resume-polish-enhanced',
      icon: Sparkles,
      text: 'Translate JD signals into truthful Work, Projects, and Skills rewrites for medical roles.',
    },
    {
      name: 'browser-testing-with-devtools',
      icon: ShieldCheck,
      text: 'Verify form behavior and application workflow screens before an agent run is trusted.',
    },
  ]

  const linkedInTools = [
    { name: 'get_company_profile', icon: Building2 },
    { name: 'get_company_posts', icon: MessagesSquare },
    { name: 'search_jobs', icon: Briefcase },
    { name: 'search_people', icon: Users },
    { name: 'get_job_details', icon: FileText },
  ]

  return (
    <aside className="rounded-lg border border-gray-200 bg-white p-4 xl:sticky xl:top-4 xl:self-start">
      <div className="flex items-start gap-3">
        <PlugZap className="mt-1 h-4 w-4 text-teal-700" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-teal-700">Career agent skills</p>
          <h2 className="mt-1 text-base font-semibold">Optional boosters</h2>
          <p className="mt-2 text-xs leading-relaxed text-gray-600">
            Progressive skills and MCP context for the Agent workflow. Keep them off until a run needs extra search, LinkedIn, or resume-polish support.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">{open ? 'Skills enabled' : 'Skills disabled'}</div>
            <div className="mt-1 text-xs text-gray-500">3 local skills · 5 LinkedIn MCP tools</div>
          </div>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className={`rounded-md px-3 py-2 text-xs font-medium ${
              open ? 'border border-teal-700 bg-white text-teal-800 hover:bg-teal-50' : 'bg-teal-700 text-white hover:bg-teal-800'
            }`}
          >
            {open ? 'Disable' : 'Enable'}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-4">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Local skills</div>
            <div className="space-y-2">
              {localSkills.map((skill) => {
                const Icon = skill.icon
                return (
                  <article key={skill.name} className="rounded-md border border-gray-200 bg-white p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <Icon className="h-4 w-4 text-teal-700" />
                      {skill.name}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-gray-600">{skill.text}</p>
                  </article>
                )
              })}
            </div>
          </div>

          <div className="rounded-md border border-dashed border-teal-300 bg-teal-50 p-3">
            <div className="text-sm font-semibold text-teal-950">stickerdaniel/linkedin-mcp-server</div>
            <p className="mt-1 text-xs leading-relaxed text-teal-900">
              Optional LinkedIn context layer for company background, recent posts, matching jobs, stakeholders, and job details.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {linkedInTools.map((tool) => {
                const Icon = tool.icon
                return (
                  <div key={tool.name} className="inline-flex items-center gap-1.5 rounded-md border border-teal-200 bg-white px-2.5 py-1.5 text-xs font-medium text-teal-950">
                    <Icon className="h-3.5 w-3.5 text-teal-700" />
                    {tool.name}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

export async function loadCareerConsoleState(loadVersions = loadCareerVersions, loadJobs = loadCareerJobs, loadRuns = loadCareerRuns) {
  try {
    const careerVersions = await loadVersions()
    let careerJobs = []
    let careerRuns = []
    const [jobsResult, runsResult] = await Promise.allSettled([loadJobs(), loadRuns()])
    careerJobs = jobsResult.status === 'fulfilled' ? jobsResult.value : []
    careerRuns = runsResult.status === 'fulfilled' ? runsResult.value : []
    return {
      careerVersions,
      careerJobs,
      careerRuns,
      loadError: '',
      loading: false,
    }
  } catch (error) {
    return {
      careerVersions: [],
      careerJobs: [],
      careerRuns: [],
      loadError: 'Unable to load local career versions. Review the intake helper and try regenerating the local data.',
      loading: false,
    }
  }
}

function mergeCareerRows(versionRows, jobs) {
  const rowsBySlug = new Map(versionRows.map((row) => [row.slug, row]))
  for (const job of jobs) {
    const slug = job.legacySlug || job.slug
    const existing = rowsBySlug.get(slug)
    rowsBySlug.set(slug, existing
      ? { ...existing, jobId: job.id, stage: job.stage, runtimeStatus: job.status }
      : {
          slug,
          jobId: job.id,
          label: [job.company, job.roleTitle].filter(Boolean).join(' - ') || job.roleTitle,
          archetype: job.stage.replaceAll('_', ' '),
          nextAction: 'Open this Job to review its current workflow stage.',
          status: job.status,
          runtimeStatus: job.status,
          stage: job.stage,
          hasPdf: false,
          pdfPath: '',
        })
  }
  return [...rowsBySlug.values()]
}

function PendingJobResults() {
  return (
    <>
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Evidence Review</h2>
        <p className="mt-2 text-sm text-gray-600">Evidence Review will populate after this JD-specific version exists.</p>
      </section>
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Manual Apply Pack</h2>
        <p className="mt-2 text-sm text-gray-600">The application pack will assemble HR, LinkedIn, email, and PDF artifacts after generation.</p>
      </section>
    </>
  )
}

export function NewJobPanel({ selected, onStartNew, onWorkflowComplete, onUpdate }) {
  return (
    <div className="max-w-5xl space-y-6">
      <JdIntakeHelper onStartNew={onStartNew} onWorkflowComplete={onWorkflowComplete} />
      {selected ? (
        <>
          <ScoreRubricPanel />
          <EvidenceReview version={selected} />
          <ApplyPack version={selected} onUpdate={onUpdate} />
        </>
      ) : <PendingJobResults />}
      <details className="group rounded-lg border border-gray-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5">
          <div>
            <p className="text-sm font-medium text-teal-700">Optional resume evidence workspace</p>
            <h2 className="mt-1 text-lg font-semibold">Portfolio Studio</h2>
            <p className="mt-1 text-sm text-gray-600">Add or refine evidence only when this Job needs material that is missing from the base resume.</p>
          </div>
          <span className="text-sm font-medium text-teal-700 group-open:hidden">Open</span>
          <span className="hidden text-sm font-medium text-teal-700 group-open:inline">Close</span>
        </summary>
        <div className="border-t border-gray-200 p-5">
          <PortfolioStudio />
        </div>
      </details>
    </div>
  )
}

export function JobsPanel({ rows = [], loading = false, loadError = '', selected, selectedSlug, onSelect, onUpdate }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-teal-700">Jobs</p>
        <h2 className="mt-1 text-2xl font-semibold">Job portfolio</h2>
        <p className="mt-2 text-sm text-gray-600">Review stored Job projects, generated artifacts, and application state without starting another intake.</p>
      </div>
      <SummaryCards rows={rows} />
      {loading ? (
        <section className="rounded-lg border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-600">Loading local Job projects...</section>
      ) : rows.length === 0 ? (
        <section className="rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-600">
          {loadError ? 'Local Job projects could not be loaded.' : 'No Job projects yet. Use New Job to create the first tailored workflow.'}
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(320px,420px)_1fr]">
          <ApplicationBoard rows={rows} selectedSlug={selectedSlug} onSelect={onSelect} onUpdate={onUpdate} />
          <div className="space-y-6">
            {selected ? (
              <>
                <ScoreRubricPanel />
                <EvidenceReview version={selected} />
                <ApplyPack version={selected} onUpdate={onUpdate} />
              </>
            ) : (
              <section className="rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-600">Select a Job to review its results.</section>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function OpportunitiesPanel() {
  return (
    <section className="max-w-5xl rounded-lg border border-gray-200 bg-white p-5">
      <p className="text-sm font-medium text-teal-700">Opportunity Inbox</p>
      <h2 className="mt-1 text-xl font-semibold">Search results before they become Jobs</h2>
      <p className="mt-2 text-sm text-gray-600">Job connectors will collect, deduplicate, score, watch, ignore, and promote opportunities here. No full Job workspace is created until promotion.</p>
      <div className="mt-5 rounded-md border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-600">No opportunity connectors are active in Phase 1.</div>
    </section>
  )
}

export function AgentRunsPanel({ selected, runs = [] }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-teal-700">Agent Runs</p>
        <h2 className="mt-1 text-2xl font-semibold">Run queue, logs, and human approvals</h2>
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <section className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-teal-700">Local workflow history</p>
                <h3 className="mt-1 text-lg font-semibold">Persisted run events</h3>
              </div>
              <span className="text-sm text-gray-500">{runs.length} runs</span>
            </div>
            {runs.length === 0 ? (
              <p className="mt-4 rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">Run a New Job workflow to populate the event history.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {runs.map((run) => (
                  <article key={run.id} className="rounded-md border border-gray-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-semibold text-gray-900">{[run.company, run.roleTitle].filter(Boolean).join(' - ')}</h4>
                      <span className={`text-xs font-medium ${run.status === 'complete' ? 'text-teal-700' : run.status === 'failed' ? 'text-red-700' : 'text-amber-700'}`}>{run.status}</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {run.events.map((event) => (
                        <div key={event.id} className="flex gap-3 text-sm">
                          <span className="min-w-24 font-medium text-gray-800">{event.label}</span>
                          <span className="text-gray-600">{event.detail || event.type}</span>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
          <ApplicationAgentPanel selectedSlug={selected?.slug} />
        </div>
        <AgentSkillsPanel />
      </div>
    </div>
  )
}

export default function CareerConsole() {
  const { applicationState, updateRecord } = useApplicationState()
  const [careerVersions, setCareerVersions] = useState([])
  const [careerJobs, setCareerJobs] = useState([])
  const [careerRuns, setCareerRuns] = useState([])
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(typeof window !== 'undefined')
  const [activeTab, setActiveTab] = useState('new-job')
  const [activeNewJobSlug, setActiveNewJobSlug] = useState('')
  const [workflowVersions, setWorkflowVersions] = useState([])

  const reloadCareerVersions = useCallback(async () => {
    setLoading(true)
    const { careerVersions: nextVersions, careerJobs: nextJobs, careerRuns: nextRuns, loadError: nextLoadError, loading: nextLoading } = await loadCareerConsoleState()
    setCareerVersions(nextVersions)
    setCareerJobs(nextJobs)
    setCareerRuns(nextRuns)
    setLoadError(nextLoadError)
    setLoading(nextLoading)
  }, [])

  useEffect(() => {
    let active = true
    reloadCareerVersions().catch(() => {
      if (active) setLoading(false)
    })
    return () => {
      active = false
    }
  }, [reloadCareerVersions])

  const versionRows = useMemo(() => deriveCareerRows({ versions: [...workflowVersions, ...careerVersions.filter((version) => !workflowVersions.some((result) => result.slug === version.slug))], applicationState }), [careerVersions, workflowVersions, applicationState])
  const rows = useMemo(() => mergeCareerRows(versionRows, careerJobs), [versionRows, careerJobs])
  const [selectedSlug, setSelectedSlug] = useState(rows[0]?.slug || '')
  const selected = rows.find((row) => row.slug === selectedSlug) || rows[0]
  const activeNewJob = rows.find((row) => row.slug === activeNewJobSlug)

  useEffect(() => {
    if (!selectedSlug && rows[0]?.slug) {
      setSelectedSlug(rows[0].slug)
    }
  }, [rows, selectedSlug])

  const handleWorkflowComplete = useCallback((result) => {
    const { slug } = result
    setWorkflowVersions((versions) => [{ ...result, label: result.metadata?.roleLabel || slug }, ...versions.filter((version) => version.slug !== slug)])
    setActiveNewJobSlug(slug)
    setSelectedSlug(slug)
    reloadCareerVersions()
  }, [reloadCareerVersions])

  const handleStartNewJob = useCallback(() => {
    setActiveNewJobSlug('')
  }, [])

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-teal-700">
              <ShieldCheck className="h-4 w-4" />
              Local-only workspace
            </p>
            <h1 className="mt-2 text-3xl font-bold">Career-Ops Center</h1>
            <p className="mt-2 max-w-3xl text-gray-600">
              Scan roles, evaluate JD/CV fit, prepare evidence, and run a local application agent without mixing the resume editor into this console.
            </p>
          </div>
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <Home className="h-4 w-4" />
            Resume home
          </a>
        </header>

        <nav className="mb-6 flex flex-wrap gap-2" aria-label="Career console tabs">
          {CONSOLE_TABS.map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ${
                  active ? 'border-teal-700 bg-teal-700 text-white' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
                aria-pressed={active}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>

        {activeTab === 'new-job' && <NewJobPanel selected={activeNewJob} onStartNew={handleStartNewJob} onWorkflowComplete={handleWorkflowComplete} onUpdate={updateRecord} />}
        {activeTab === 'opportunities' && <OpportunitiesPanel />}
        {activeTab === 'jobs' && <JobsPanel rows={rows} loading={loading} loadError={loadError} selected={selected} selectedSlug={selected?.slug} onSelect={setSelectedSlug} onUpdate={updateRecord} />}
        {activeTab === 'runs' && <AgentRunsPanel selected={selected} runs={careerRuns} />}
        {activeTab === 'interview' && <InterviewRolePlay />}
      </div>
    </main>
  )
}
