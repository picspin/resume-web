import { useEffect, useMemo, useState } from 'react'
import { Clipboard, Copy, FileText, Sparkles } from 'lucide-react'
import {
  PORTFOLIO_STORAGE_KEY,
  PROJECT_TYPE_OPTIONS,
  buildPortfolioDraft,
} from './portfolioDrafts'

const EMPTY_FORM = {
  title: '',
  projectType: 'medical-ai',
  role: '',
  dateRange: '',
  githubUrl: '',
  imagePath: '',
  rawText: '',
  jdText: '',
}

function readPortfolioDraft() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(PORTFOLIO_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function writePortfolioDraft(record) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(record))
  } catch {
    // Local draft persistence is best-effort only.
  }
}

function clearPortfolioDraft() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(PORTFOLIO_STORAGE_KEY)
  } catch {
    // Local draft persistence is best-effort only.
  }
}

async function copyToClipboard(text) {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return false
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export default function PortfolioStudio({ onDraftChange = () => {} }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [draft, setDraft] = useState(null)
  const [copied, setCopied] = useState('')

  useEffect(() => {
    const saved = readPortfolioDraft()
    if (saved?.form) setForm({ ...EMPTY_FORM, ...saved.form })
    if (saved?.draft) {
      setDraft(saved.draft)
      onDraftChange(saved.draft)
    }
  }, [onDraftChange])

  const jsonPatchText = useMemo(() => {
    if (!draft) return ''
    return JSON.stringify(draft.jsonPatch, null, 2)
  }, [draft])

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const generateDraft = () => {
    const nextDraft = buildPortfolioDraft(form)
    setDraft(nextDraft)
    onDraftChange(nextDraft)
    writePortfolioDraft({ form, draft: nextDraft, updatedAt: new Date().toISOString() })
  }

  const resetDraft = () => {
    setForm(EMPTY_FORM)
    setDraft(null)
    onDraftChange(null)
    setCopied('Local draft cleared')
    clearPortfolioDraft()
  }

  const copyDraft = async (label, text) => {
    const ok = await copyToClipboard(text)
    setCopied(ok ? label : 'Clipboard unavailable')
  }

  return (
    <section className="mb-6 rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-teal-700">
            <Sparkles className="h-4 w-4" />
            Portfolio Studio
          </p>
          <h2 className="mt-1 text-xl font-semibold">Project and skills draft builder</h2>
          <p className="mt-2 max-w-3xl text-sm text-gray-600">
            Convert new GitHub work, medical product evidence, and JD context into a review payload for the web resume.
            No files are changed until you manually approve and apply the patch.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={resetDraft}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={generateDraft}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
          >
            <Clipboard className="h-4 w-4" />
            Generate draft
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-gray-700">
              Project title
              <input
                value={form.title}
                onChange={updateField('title')}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                placeholder="Radiology RAG Enablement"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Project type
              <select
                value={form.projectType}
                onChange={updateField('projectType')}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
              >
                {PROJECT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-gray-700">
              Role
              <input
                value={form.role}
                onChange={updateField('role')}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                placeholder="Solution owner"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Date
              <input
                value={form.dateRange}
                onChange={updateField('dateRange')}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                placeholder="2025"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-gray-700">
              GitHub URL
              <input
                value={form.githubUrl}
                onChange={updateField('githubUrl')}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                placeholder="https://github.com/picspin/project"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Image path
              <input
                value={form.imagePath}
                onChange={updateField('imagePath')}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                placeholder="/images/projects/project-24.jpg"
              />
            </label>
          </div>

          <label className="block text-sm font-medium text-gray-700">
            Project evidence
            <textarea
              value={form.rawText}
              onChange={updateField('rawText')}
              rows={6}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
              placeholder="What you built, medical context, users, workflow, tools, outcomes, and proof."
            />
          </label>

          <label className="block text-sm font-medium text-gray-700">
            JD context
            <textarea
              value={form.jdText}
              onChange={updateField('jdText')}
              rows={4}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
              placeholder="Paste a target JD excerpt to bias the draft toward medical AI, device R&D, digital health, or BD language."
            />
          </label>
        </div>

        <div className="space-y-4">
          {draft ? (
            <>
              {draft.warnings.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  {draft.warnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </div>
              )}

              <div className="rounded-md border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold">{draft.webProject.title}</h3>
                    <p className="mt-2 text-sm text-gray-600">{draft.webProject.description}</p>
                    <p className="mt-2 text-xs text-gray-500">{draft.webProject.image}</p>
                  </div>
                  <FileText className="h-5 w-5 shrink-0 text-teal-700" />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-800">Resume bullet</h3>
                <p className="mt-2 rounded-md bg-gray-50 p-3 text-sm text-gray-700">{draft.resumeBullet}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-800">Suggested skills</h3>
                <div className="mt-2 space-y-2">
                  {draft.skillSuggestions.map((group) => (
                    <div key={group.category} className="rounded-md bg-gray-50 p-3 text-sm">
                      <div className="font-medium text-gray-800">{group.category}</div>
                      <div className="mt-1 text-gray-600">{group.skills.join(', ')}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => copyDraft('AI prompt copied', draft.aiPrompt)}
                  className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy AI prompt
                </button>
                <button
                  type="button"
                  onClick={() => copyDraft('Review payload copied', jsonPatchText)}
                  className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy review payload
                </button>
              </div>
              {copied && <p className="text-xs text-gray-500">{copied}</p>}

              <div>
                <h3 className="text-sm font-semibold text-gray-800">AI polish prompt</h3>
                <textarea
                  readOnly
                  value={draft.aiPrompt}
                  rows={8}
                  className="mt-2 w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700"
                />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-800">Review payload</h3>
                <textarea
                  readOnly
                  value={jsonPatchText}
                  rows={8}
                  className="mt-2 w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700"
                />
              </div>
            </>
          ) : (
            <div className="flex min-h-full items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-600">
              Add project evidence and generate a local draft before moving it into the public resume layout.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
