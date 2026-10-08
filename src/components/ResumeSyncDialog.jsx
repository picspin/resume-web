import { useEffect, useId, useRef, useState } from 'react'
import { Eye, Github, Loader2, Upload, X } from 'lucide-react'

const inputClass = 'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600'

async function request(action, payload, signal) {
  const response = await fetch(`/api/career/resume-sync/${action}`, {
    method: payload ? 'POST' : 'GET',
    credentials: 'same-origin',
    ...(payload ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) } : {}),
    signal,
  })
  if (!response.ok) {
    if (response.status === 409) throw new Error('The destination changed. Preview again before publishing.')
    if (response.status === 401 || response.status === 403) throw new Error('GitHub authentication or repository permission is required. Check the local GitHub CLI.')
    throw new Error('GitHub sync is unavailable. Check the local service and repository, then try again.')
  }
  return response.json()
}

function SyncSession({ document: resumeDocument, onClose, onSynced }) {
  const dialogRef = useRef(null)
  const requestRef = useRef(null)
  const titleId = useId()
  const [target, setTarget] = useState({ repository: resumeDocument?.source?.kind === 'personal-sample' && resumeDocument?.source?.sampleId === 'xiaolei' ? 'picspin/meinCV' : '', branch: 'main', createNew: false, visibility: 'private' })
  const [status, setStatus] = useState(null)
  const [statusAttempt, setStatusAttempt] = useState(0)
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [published, setPublished] = useState(false)
  const payloadKey = JSON.stringify({ document: resumeDocument, target })
  const currentKey = useRef(payloadKey)
  currentKey.current = payloadKey
  const validPreview = preview?.key === payloadKey ? preview : null
  const accountLogin = typeof status?.login === 'string' && /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(status.login) ? status.login : ''
  const validTarget = /^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+$/.test(target.repository) && !!target.branch.trim()

  useEffect(() => {
    const dialog = dialogRef.current
    const previouslyFocused = globalThis.document?.activeElement
    dialog?.showModal()
    return () => {
      dialog?.close()
      previouslyFocused?.focus?.()
      requestRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setStatus(null)
    request('status', null, controller.signal).then((result) => {
      if (!controller.signal.aborted) setStatus(result)
    }).catch(() => {
      if (!controller.signal.aborted) setStatus({ authenticated: false })
    })
    return () => controller.abort()
  }, [statusAttempt])

  useEffect(() => {
    requestRef.current?.abort()
    requestRef.current = null
    setBusy('')
    setPreview(null)
    setError('')
    setPublished(false)
  }, [payloadKey])

  function updateTarget(patch) {
    setPreview(null)
    setTarget((value) => ({ ...value, ...patch }))
  }

  async function run(action) {
    if (requestRef.current || !validTarget || !status?.authenticated || (action === 'publish' && !validPreview)) return
    const controller = new AbortController()
    requestRef.current = controller
    const key = payloadKey
    setBusy(action)
    setError('')
    setPublished(false)
    if (action === 'preview') setPreview(null)
    let result
    try {
      const payload = JSON.parse(key)
      if (action === 'publish') payload.confirmationToken = validPreview.confirmationToken
      result = await request(action, payload, controller.signal)
      if (controller.signal.aborted || currentKey.current !== key) return
      if (action === 'preview') {
        const visibility = result.repositoryVisibility ?? result.visibility
        if (!result.confirmationToken || typeof result.html !== 'string' || !result.html.trim() || result.target?.repository !== target.repository || result.target?.branch !== target.branch || !['private', 'public'].includes(visibility) || !Array.isArray(result.changedPaths) || !result.changedPaths.every((path) => typeof path === 'string')) {
          throw new Error('The service returned an incomplete preview. Publishing is disabled.')
        }
        setPreview({ ...result, visibility, key })
      } else {
        setPreview(null)
        setPublished(true)
      }
    } catch (cause) {
      if (!controller.signal.aborted && currentKey.current === key) {
        setPreview(null)
        setError(cause instanceof SyntaxError || cause instanceof TypeError ? 'Unable to reach the local sync service. Try again.' : cause.message)
      }
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null
        setBusy('')
      }
    }
    if (action === 'publish' && result && !controller.signal.aborted && currentKey.current === key) onSynced?.(result)
  }

  return (
    <dialog ref={dialogRef} aria-labelledby={titleId} aria-modal="true" onCancel={(event) => { event.preventDefault(); onClose() }}
      className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-lg border border-gray-200 bg-white p-5 text-gray-950 shadow-xl backdrop:bg-black/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0"><h2 id={titleId} className="flex items-center gap-2 text-lg font-semibold"><Github aria-hidden="true" size={20} />GitHub sync</h2><p className="mt-1 break-words text-sm text-gray-500">{resumeDocument?.name}</p></div>
        <button type="button" onClick={onClose} aria-label="Close GitHub sync" title="Close GitHub sync" className={buttonClass}><X aria-hidden="true" size={18} /></button>
      </header>
      <div role="status" className="my-4 text-sm">
        {!status ? 'Checking GitHub authentication...' : status.authenticated ? accountLogin ? `GitHub connected as ${accountLogin}` : 'GitHub connected' : 'GitHub unavailable. Authenticate with the local GitHub CLI.'}
        {status && !status.authenticated && <button type="button" className={`${buttonClass} ml-2`} onClick={() => setStatusAttempt((value) => value + 1)}>Retry</button>}
      </div>
      <fieldset disabled={!!busy} className="space-y-4">
        <legend className="sr-only">Repository target</legend>
        <div className="flex flex-wrap gap-4">{[false, true].map((createNew) => <label key={String(createNew)} className="flex items-center gap-2 text-sm"><input type="radio" name={`${titleId}-mode`} checked={target.createNew === createNew} onChange={() => updateTarget({ createNew })} />{createNew ? 'New repository' : 'Existing repository'}</label>)}</div>
        <label className="block text-sm">Repository<input autoFocus autoComplete="off" spellCheck={false} className={inputClass} placeholder="owner/repository" value={target.repository} onChange={(event) => updateTarget({ repository: event.target.value })} /></label>
        <label className="block text-sm">Branch<input autoComplete="off" spellCheck={false} className={inputClass} value={target.branch} onChange={(event) => updateTarget({ branch: event.target.value })} /></label>
        {target.createNew && <fieldset><legend className="mb-2 text-sm">New repository visibility</legend><div className="flex gap-4">{['private', 'public'].map((visibility) => <label key={visibility} className="flex items-center gap-2 text-sm"><input type="radio" name={`${titleId}-visibility`} checked={target.visibility === visibility} onChange={() => updateTarget({ visibility })} />{visibility === 'private' ? 'Private' : 'Public'}</label>)}</div></fieldset>}
      </fieldset>
      {validPreview && <section aria-label="Publish preview" className="mt-4 border-t border-gray-200 pt-4 text-sm dark:border-gray-700">
        <dl className="space-y-1 break-all"><div><dt className="inline font-medium">Destination: </dt><dd className="inline">{validPreview.target.repository}</dd></div><div><dt className="inline font-medium">Branch: </dt><dd className="inline">{validPreview.target.branch}</dd></div><div><dt className="inline font-medium">Visibility: </dt><dd className="inline">{validPreview.visibility}</dd></div></dl>
        {validPreview.visibility === 'public' && <p className="mt-2 text-red-700 dark:text-red-300">The selected resume, photos, and contact details will be publicly accessible.</p>}
        {Array.isArray(validPreview.warnings) && validPreview.warnings.filter((warning) => typeof warning === 'string').map((warning, index) => <p key={index} className="mt-2 break-words text-sm">{warning}</p>)}
        <h3 className="mt-3 font-medium">Changed paths</h3><ul className="mt-1 space-y-1 break-all font-mono text-xs">{validPreview.changedPaths.map((path) => <li key={path}>{path}</li>)}</ul>
        {!validPreview.changedPaths.length && <p>No changes to publish.</p>}
        <iframe title="Exact resume publication preview" sandbox="" referrerPolicy="no-referrer" srcDoc={validPreview.html} className="mt-4 block h-[55dvh] min-h-64 w-full rounded-md border border-gray-200 bg-white" />
      </section>}
      {error && <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300">{error}</p>}
      <p role="status" aria-live="polite" className="mt-3 text-sm">{busy === 'preview' ? 'Preparing preview...' : busy === 'publish' ? 'Publishing... Closing this dialog may not stop the publish. Check the repository before retrying.' : published ? 'Resume published to GitHub.' : ''}</p>
      <footer className="mt-4 flex flex-wrap justify-end gap-2">
        <button type="button" className={buttonClass} disabled={!!busy || !status?.authenticated || !validTarget || !resumeDocument?.id} onClick={() => run('preview')}><Eye aria-hidden="true" size={16} />Preview changes</button>
        <button type="button" className={`${buttonClass} bg-blue-700 text-white`} disabled={!!busy || !validPreview?.changedPaths.length || !status?.authenticated} onClick={() => run('publish')}>{busy === 'publish' ? <Loader2 aria-hidden="true" size={16} className="animate-spin" /> : <Upload aria-hidden="true" size={16} />}Publish</button>
      </footer>
    </dialog>
  )
}

export default function ResumeSyncDialog({ document, open, onClose, onSynced }) {
  return open ? <SyncSession key={document?.id} document={document} onClose={onClose} onSynced={onSynced} /> : null
}
