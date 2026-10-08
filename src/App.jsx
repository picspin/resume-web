import { lazy, Suspense, useState, useEffect, useRef } from 'react'
import EditableResumeShell from './components/EditableResumeShell'
import ResumeLibrary from './components/ResumeLibrary'
import ResumeSyncDialog from './components/ResumeSyncDialog'
import Header from './components/Header'
import { safeImageUrl } from './components/projectImages.js'
import { exportWebResumePdf } from './components/webResumePdfExport'
import { createDocument, sanitizeResume } from './resume/documents.js'
import resumeVersions from './data/resume-versions.json'
import * as storage from './resume/storage.js'
import { isCareerConsoleEnabled, isCareerPath } from './career/careerConsoleEnabled'
import './App.css'

const CareerConsole = import.meta.env.DEV ? lazy(() => import('./career/CareerConsole')) : null

function ResumeApp() {
  const local = import.meta.env.DEV
  const [lang, setLang] = useState('en')
  const [selectedVersion, setSelectedVersion] = useState('default')
  const [publicDocument, setPublicDocument] = useState(() => local ? null : createDocument({ mode: 'sample' }))
  const [library, setLibrary] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [drafts, setDrafts] = useState({})
  const draftsRef = useRef(drafts)
  draftsRef.current = drafts
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const locked = useRef(false)
  const [syncOpen, setSyncOpen] = useState(false)
  const [dark, setDark] = useState(() => {
    try { const saved = localStorage.getItem('darkMode'); return saved ? JSON.parse(saved) === true : window.matchMedia('(prefers-color-scheme: dark)').matches } catch { return false }
  })
  const activeDocument = local ? drafts[activeId] || library?.documents.find(document => document.id === activeId) : publicDocument
  const dirty = local && Object.keys(drafts).length > 0
  useEffect(() => {
    try { localStorage.setItem('darkMode', JSON.stringify(dark)) } catch { /* Appearance remains usable without storage. */ }
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])
  useEffect(() => {
    if (!local) return
    let cancelled = false
    const refresh = async () => {
      try {
        const next = await storage.loadLibrary()
        if (cancelled) return
        setLibrary(next)
        const requested = new URLSearchParams(window.location.search).get('document')
        setActiveId(current => {
          const available = id => Boolean(draftsRef.current[id]) || next.documents.some(item => item.id === id)
          return requested && available(requested) ? requested : current && available(current) ? current : next.activeDocumentId
        })
      } catch (cause) { if (!cancelled) setError(cause.message) }
    }
    refresh()
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', refresh)
    window.addEventListener('popstate', refresh)
    return () => { cancelled = true; window.removeEventListener('focus', refresh); window.removeEventListener('storage', refresh); window.removeEventListener('popstate', refresh) }
  }, [local])
  useEffect(() => {
    if (!dirty) return
    const warn = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  const change = document => { setDrafts(current => ({ ...current, [document.id]: document })); setNotice('') }
  const pointTo = id => {
    setActiveId(id)
    const url = new URL(window.location.href)
    if (id) url.searchParams.set('document', id); else url.searchParams.delete('document')
    window.history.replaceState(null, '', url)
  }
  const run = async operation => {
    if (locked.current) return false
    locked.current = true; setBusy(true); setError(''); setNotice('')
    try { await operation(); return true } catch (cause) { setError(cause.message || 'Operation failed. Your edits are preserved.'); return false } finally { locked.current = false; setBusy(false) }
  }
  const save = async () => {
    const snapshot = activeDocument
    const saved = await storage.saveDocument(snapshot, { expectedRevision: snapshot.revision })
    setLibrary(current => ({ ...current, documents: current.documents.map(document => document.id === saved.id ? saved : document) }))
    setDrafts(current => {
      const next = { ...current }
      if (!next[saved.id] || JSON.stringify(next[saved.id]) === JSON.stringify(snapshot)) delete next[saved.id]
      else next[saved.id] = { ...next[saved.id], revision: saved.revision }
      return next
    })
    return saved
  }
  const create = (mode, language = 'en') => run(async () => {
    const document = createDocument({ mode, language, sourceDocument: activeDocument })
    const saved = await storage.saveDocument(document, { expectedRevision: 0 })
    const next = await storage.selectDocument(saved.id)
    setLibrary(next); pointTo(saved.id)
  })
  const handleDownload = () => exportWebResumePdf({ title: `${activeDocument?.resume.general.name || activeDocument?.name || 'Resume'} - ${activeDocument?.name || 'Web Resume'}` })
  const selectPublishedVersion = slug => {
    setSelectedVersion(slug)
    const version = resumeVersions.find(item => item.slug === slug)
    setPublicDocument(version ? { ...createDocument(), id: version.slug, name: version.label, resume: sanitizeResume(version.resume) } : createDocument({ mode: 'sample', language: lang }))
  }
  const careerConsoleAvailable = isCareerConsoleEnabled({ env: import.meta.env, pathname: '/career' })
  return <div className={`min-h-screen transition-colors duration-300 resume-theme-${activeDocument?.theme || 'default'} ${dark ? 'dark bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
    {safeImageUrl(activeDocument?.resume.banner) && <div className="fixed top-0 left-0 w-full h-80 z-0"><img src={safeImageUrl(activeDocument.resume.banner)} className="w-full h-full object-cover" alt="Resume banner" /><div className="absolute inset-0 bg-gradient-to-b from-white/80 to-white/40 dark:from-gray-900/80 dark:to-gray-900/40" /></div>}
    <main className="resume-print-page relative z-10 max-w-4xl mx-auto pt-12 pb-8 px-4">
      <Header lang={lang} setLang={language => { setLang(language); setPublicDocument(createDocument({ mode: 'sample', language })) }} dark={dark} setDark={setDark} onDownload={handleDownload} showDownload={!local} showLanguage={!local} versions={local ? [] : resumeVersions} selectedVersion={selectedVersion} setSelectedVersion={selectPublishedVersion} languageDisabled={selectedVersion !== 'default'} />
      {local && <ResumeLibrary key={`library-${activeDocument?.id || 'empty'}`} library={library} activeDocument={activeDocument} drafts={drafts} busy={busy} onSelect={id => run(async () => { setLibrary(await storage.selectDocument(id)); pointTo(id) })} onCreate={create} onDuplicate={() => create('duplicate')} onRename={name => change({ ...activeDocument, name })}
        onDelete={() => run(async () => { const id = activeDocument.id; const next = await storage.deleteDocument(id); setLibrary(next); setDrafts(current => { const remaining = { ...current }; delete remaining[id]; return remaining }); pointTo(next.activeDocumentId) })}
        onVersion={label => run(async () => { const saved = await save(); await storage.saveVersion(saved, label); setLibrary(await storage.loadLibrary()); setNotice('Version saved') })}
        onRestore={id => run(async () => { const restored = await storage.restoreVersion(id); setLibrary(await storage.loadLibrary()); pointTo(restored.id); setNotice('Restored as a new resume') })} />}
      {error && <p role="alert" className="resume-error no-print">{error}</p>}
      {notice && <p role="status" className="resume-notice no-print">{notice}</p>}
      {activeDocument ? <EditableResumeShell key={activeDocument.id} document={activeDocument} onChange={change} canEdit={local} showProfile busy={busy} dirty={Boolean(drafts[activeId])} careerConsoleAvailable={careerConsoleAvailable} onExportPdf={handleDownload} onSave={() => run(async () => { await save(); setNotice('Saved locally') })} onSync={() => setSyncOpen(true)} />
        : <p className="resume-empty">{library ? 'No resume selected' : error ? 'Resume library unavailable' : 'Loading resumes...'}</p>}
      {local && activeDocument && <ResumeSyncDialog document={activeDocument} open={syncOpen} onClose={() => setSyncOpen(false)} onSynced={() => setNotice('Resume synced')} />}
    </main>
  </div>
}

export default function App() {
  const pathname = window.location.pathname
  if (isCareerConsoleEnabled({ env: import.meta.env, pathname }) && CareerConsole) return <Suspense fallback={<p>Loading workspace...</p>}><CareerConsole /></Suspense>
  if (isCareerPath(pathname)) return <main><h1>Page not found</h1></main>
  return <ResumeApp />
}
