import { CheckCircle2, ExternalLink, Search, ShieldCheck, UploadCloud } from 'lucide-react'
import { useMemo, useState } from 'react'

const AGENT_STEPS = [
  {
    label: 'Scan job page',
    description: 'Open the link with a local browser agent and identify the application form, login state, and upload fields.',
    icon: Search,
  },
  {
    label: 'Map application fields',
    description: 'Match name, contact, work history, skills, and custom questions against the local resume profile.',
    icon: CheckCircle2,
  },
  {
    label: 'Attach resume PDF',
    description: 'Select the tailored PDF generated for the current role slug when it exists.',
    icon: UploadCloud,
  },
  {
    label: 'Human confirmation',
    description: 'Pause before final submit so you can inspect every field and attachment.',
    icon: ShieldCheck,
  },
]

function normalizeUrl(value) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export default function ApplicationAgentPanel({ selectedSlug = 'new-role-slug' }) {
  const [jobLink, setJobLink] = useState('')
  const [started, setStarted] = useState(false)
  const [agentActive, setAgentActive] = useState(false)
  const normalizedUrl = useMemo(() => normalizeUrl(jobLink), [jobLink])
  const pdfPath = `/generated-resumes/${selectedSlug}.pdf`
  const logActive = agentActive || started

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-teal-700">Application Agent</p>
          <h2 className="mt-1 text-lg font-semibold">Local browser automation with a submit gate</h2>
          <p className="mt-2 max-w-3xl text-sm text-gray-600">
            Paste a job link to prepare a Playwright-style local browser workflow for scanning, form filling, resume upload,
            and final human review. No final submission without confirmation.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAgentActive((active) => !active)}
            className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
              agentActive ? 'bg-teal-700 text-white hover:bg-teal-800' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
            aria-pressed={agentActive}
          >
            <ShieldCheck className="h-4 w-4" />
            Agent Active {agentActive ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-sm font-medium text-white hover:bg-teal-800"
          >
            <Search className="h-4 w-4" />
            Scan job page
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
        <div className="flex items-center justify-between gap-3">
          <span className="font-medium">{agentActive ? 'Agent Active' : 'Manual mode'}</span>
          <span className="text-xs text-gray-500">local browser · human submit gate</span>
        </div>
        {logActive && (
          <div className="mt-3 rounded-md bg-white p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Live local log</div>
            <ol className="mt-2 space-y-1 text-xs text-gray-700">
              <li>Scan job page: locate role metadata, login state, and apply CTA.</li>
              <li>Map application fields: match profile, resume sections, and custom Q&A.</li>
              <li>Attach resume PDF: use <code>{pdfPath}</code> when available.</li>
              <li>Pause before final submit: wait for human review and confirmation.</li>
            </ol>
          </div>
        )}
      </div>

      <label className="mt-4 block text-sm font-medium text-gray-700">
        Job link
        <input
          value={jobLink}
          onChange={(event) => setJobLink(event.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
          placeholder="https://jobs.example.com/medical-ai-product-lead"
        />
      </label>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        {AGENT_STEPS.map((step, index) => {
          const Icon = step.icon
          const active = logActive || index === 0
          return (
            <div key={step.label} className="rounded-md border border-gray-200 bg-gray-50 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Icon className={`h-4 w-4 ${active ? 'text-teal-700' : 'text-gray-400'}`} />
                {step.label}
              </div>
              <p className="mt-2 text-xs text-gray-600">{step.description}</p>
            </div>
          )
        })}
      </div>

      <div className="mt-4 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
        <div>Target PDF: <code>{pdfPath}</code></div>
        {normalizedUrl ? (
          <a
            href={normalizedUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-teal-700 underline"
          >
            Open job link manually
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : (
          <p className="mt-2 text-xs text-gray-500">Paste a link to enable manual open and local agent scanning.</p>
        )}
      </div>
    </section>
  )
}
