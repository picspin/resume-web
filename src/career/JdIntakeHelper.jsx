import { useEffect, useMemo, useRef, useState } from 'react'
import { loadLibrary, importOptimizedResume, selectDocument } from '../resume/storage'
import ResumeSyncDialog from '../components/ResumeSyncDialog'
import { CheckCircle2, Circle, Copy, Loader2, PlayCircle, RotateCcw } from 'lucide-react'

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'new-role-slug'
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

function initialSteps() {
  return [
    { key: 'intake', label: 'JD intake', description: 'Write the company, role, and JD to a local file.' },
    { key: 'adapt', label: 'Resume adapt', description: 'Generate a tailored version from local resume-ops.' },
    { key: 'pdf', label: 'PDF render', description: 'Render the tailored application artifact.' },
    { key: 'manifest', label: 'Manifest refresh', description: 'Refresh local versions for the board and review panels.' },
  ]
}

function normalizeWorkflowError(response, payload) {
  if (payload?.error) return payload.error
  return response.ok ? '' : 'The local workflow could not start. Check that Vite is running from this repository.'
}

export default function JdIntakeHelper({ onWorkflowComplete = () => {}, onStartNew = () => {} }) {
  const [documents, setDocuments] = useState([])
  const [sourceId, setSourceId] = useState('')
  const [libraryError, setLibraryError] = useState('')
  const [importedDocument, setImportedDocument] = useState(null)
  const [syncOpen, setSyncOpen] = useState(false)
  const running = useRef(false)
  useEffect(() => {
    let active = true
    const refresh = () => loadLibrary().then((library) => {
      if (!active) return
      setDocuments(library.documents)
      setLibraryError('')
    }).catch((error) => { if (active) setLibraryError(error.message) })
    refresh()
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', refresh)
    return () => { active = false; window.removeEventListener('focus', refresh); window.removeEventListener('storage', refresh) }
  }, [])
  const sourceDocument = documents.find((document) => document.id === sourceId)
  const [roleTitle, setRoleTitle] = useState('')
  const [company, setCompany] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [jdText, setJdText] = useState('')
  const [copied, setCopied] = useState('')
  const [workflowState, setWorkflowState] = useState('idle')
  const [workflowResult, setWorkflowResult] = useState(null)
  const [workflowError, setWorkflowError] = useState('')
  const slug = useMemo(() => slugify([company, roleTitle].filter(Boolean).join(' ')), [company, roleTitle])
  const jdPath = workflowResult?.jdPath || `career/jds/${slug}.md`
  const steps = initialSteps()
  const canRun = Boolean(sourceDocument && !libraryError && roleTitle.trim() && jdText.trim()) && workflowState !== 'running'
  const commands = workflowResult
    ? [
        `npm run resume:adapt -- --jd ${workflowResult.jdPath} --slug ${workflowResult.slug} --source ${workflowResult.sourcePath}`,
        `npm run resume:pdf -- --slug ${workflowResult.slug} --local-only`,
        'npm run resume:manifest -- --local-only',
      ]
    : []

  const copyText = async (label, text) => {
    const ok = await copyToClipboard(text)
    setCopied(ok ? `${label} copied` : 'Clipboard unavailable')
  }

  const changeInput = (setter) => (event) => {
    if (running.current) return
    setter(event.target.value)
    setWorkflowResult(null)
    setImportedDocument(null)
    setSyncOpen(false)
    setWorkflowError('')
    setWorkflowState('idle')
    setCopied('')
    onStartNew()
  }

  const startNewJob = () => {
    if (running.current) return
    setImportedDocument(null)
    setSyncOpen(false)
    setCompany('')
    setRoleTitle('')
    setSourceUrl('')
    setJdText('')
    setCopied('')
    setWorkflowError('')
    setWorkflowResult(null)
    setWorkflowState('idle')
    onStartNew()
  }

  const runWorkflow = async () => {
    if (!canRun || running.current) return
    running.current = true
    setWorkflowState('running')
    setWorkflowError('')
    setCopied('')
    setWorkflowResult(null)
    setImportedDocument(null)

    try {
      const library = await loadLibrary()
      const selectedSource = library.documents.find((document) => document.id === sourceId)
      if (!selectedSource) throw new Error('Source resume no longer exists. Select another resume from the library.')
      const sourceDocument = JSON.parse(JSON.stringify(selectedSource))
      const requestId = crypto.randomUUID()
      const response = await fetch('/api/career/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, roleTitle, jdText, sourceUrl, sourceDocument, requestId }),
      })
      const payload = await response.json().catch(() => ({}))
      const error = normalizeWorkflowError(response, payload)
      if (error) throw new Error(error)
      if (payload.requestId !== requestId || payload.sourceDocumentId !== sourceDocument.id || payload.sourceRevision !== sourceDocument.revision || !payload.resume) {
        throw new Error('Workflow result does not match the selected source. No resume was imported.')
      }
      const imported = await importOptimizedResume({ sourceDocument, resume: payload.resume, requestId, name: [sourceDocument.name, company, roleTitle].filter(Boolean).join(' - ') })
      setImportedDocument(imported)

      setWorkflowResult(payload)
      setWorkflowState('complete')
      onWorkflowComplete(payload)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('career:workflow:complete', { detail: payload }))
      }
    } catch (error) {
      setWorkflowState('error')
      setWorkflowError(error instanceof Error ? error.message : 'The local workflow failed.')
    } finally {
      running.current = false
    }
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-teal-700">JD Workflow</p>
          <h2 className="mt-1 text-lg font-semibold">Create a tailored resume version locally</h2>
          <p className="mt-2 max-w-3xl text-sm text-gray-600">
            A run writes this JD, adapts the resume, renders its PDF, refreshes the local manifest, and opens the result for Evidence Review and Manual Apply Pack.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={startNewJob}
            disabled={workflowState === 'running'}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RotateCcw className="h-4 w-4" />
            Start new job
          </button>
          <button
            type="button"
            onClick={runWorkflow}
            disabled={!canRun}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {workflowState === 'running' ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            {workflowState === 'running' ? 'Running locally' : 'Run local workflow'}
          </button>
        </div>
      </div>

      <label className="mt-4 block text-sm font-medium text-gray-700">
        Source resume
        <select aria-label="Source resume" value={sourceId} disabled={workflowState === 'running'} onChange={changeInput(setSourceId)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2">
          <option value="">Select a saved resume</option>
          {documents.map((document) => <option key={document.id} value={document.id}>{document.name} (revision {document.revision})</option>)}
        </select>
      </label>
      {(libraryError || !sourceDocument) && <p role="alert" className="mt-2 text-sm text-red-700">{libraryError || 'Select a source resume. Create and save one in the resume editor if the library is empty.'}</p>}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block text-sm font-medium text-gray-700">
          Company
          <input
            value={company}
            disabled={workflowState === 'running'}
            onChange={changeInput(setCompany)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
            placeholder="Varian"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Role title
          <input
            value={roleTitle}
            disabled={workflowState === 'running'}
            onChange={changeInput(setRoleTitle)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
            placeholder="Medical AI Product Lead"
          />
        </label>
      </div>

      <label className="mt-4 block text-sm font-medium text-gray-700">
        Job source link
        <input
          type="url"
          value={sourceUrl}
          disabled={workflowState === 'running'}
          onChange={changeInput(setSourceUrl)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
          placeholder="https://company.example/jobs/role"
        />
      </label>

      <label className="mt-4 block text-sm font-medium text-gray-700">
        JD text
        <textarea
          aria-label="JD text"
          value={jdText}
          disabled={workflowState === 'running'}
          onChange={changeInput(setJdText)}
          rows={7}
          className="mt-1 w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm leading-relaxed focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
          placeholder="Paste the job description. It will be saved locally only when you run the workflow."
        />
      </label>

      <div className="mt-4 rounded-md bg-gray-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <code className="text-sm text-gray-800">{jdPath}</code>
          <button
            type="button"
            onClick={() => copyText('JD path', jdPath)}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-white"
          >
            <Copy className="h-4 w-4" />
            Copy path
          </button>
        </div>

        <div className="mt-4">
          <div className="text-sm font-semibold text-gray-900">Visual workflow</div>
          <ol className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-4" aria-live="polite">
            {steps.map((step) => {
              const completedStep = workflowResult?.steps?.find((result) => result.key === step.key)
              const active = workflowState === 'running' && !completedStep
              const Icon = completedStep ? CheckCircle2 : active ? Loader2 : Circle
              return (
                <li key={step.key} className="rounded-md border border-gray-200 bg-white p-3 text-sm">
                  <div className="flex items-center gap-2 font-medium text-gray-900">
                    <Icon className={`h-4 w-4 ${completedStep ? 'text-teal-700' : active ? 'animate-spin text-teal-700' : 'text-gray-400'}`} />
                    {step.label}
                  </div>
                  <p className="mt-2 text-xs text-gray-600">{completedStep?.detail || step.description}</p>
                </li>
              )
            })}
          </ol>
        </div>

        <details className="mt-4 rounded-md border border-gray-200 bg-white p-3">
          <summary className="cursor-pointer text-sm font-semibold text-gray-800">Manual recovery commands</summary>
          {workflowResult ? (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => copyText('Commands', commands.join('\n'))}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Copy className="h-4 w-4" />
                Copy command bundle
              </button>
              <ol className="mt-3 space-y-2 text-sm text-gray-700">
                {commands.map((command) => <li key={command}><code>{command}</code></li>)}
              </ol>
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-600">Run the workflow once first. That creates the JD file so a copied recovery command cannot fail with ENOENT.</p>
          )}
        </details>
      </div>

      {workflowState === 'error' && <p role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{workflowError}</p>}
      {workflowState === 'complete' && <p role="status" className="mt-3 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">Ready for Evidence Review and Manual Apply Pack: {workflowResult?.slug}</p>}
      {importedDocument && <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" onClick={async () => {
          try { await selectDocument(importedDocument.id); window.location.assign(`/?document=${encodeURIComponent(importedDocument.id)}`) }
          catch (error) { setWorkflowError(error.message); setWorkflowState('error') }
        }} className="rounded-md border px-3 py-2 text-sm">Open in editor</button>
        <button type="button" onClick={() => setSyncOpen(true)} className="rounded-md border px-3 py-2 text-sm">Sync result</button>
      </div>}
      <ResumeSyncDialog document={importedDocument} open={syncOpen} onClose={() => setSyncOpen(false)} />
      {jdText && <p className="mt-3 text-xs text-gray-500">{jdText.length} JD characters ready for a local run.</p>}
      {copied && <p className="mt-3 text-xs text-gray-500">{copied}</p>}
    </section>
  )
}
