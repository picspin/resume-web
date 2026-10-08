import { Copy, Plus, RotateCcw, Save, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { IconButton } from './EditableResumeShell'

export default function ResumeLibrary({ library, activeDocument, drafts = {}, busy, onSelect, onCreate, onDuplicate, onDelete, onRename, onVersion, onRestore }) {
  const [versionLabel, setVersionLabel] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const versions = (library?.versions || []).filter(version => version.documentId === activeDocument?.id)
  const documents = [...(library?.documents || []), ...Object.values(drafts).filter(draft => !library?.documents.some(document => document.id === draft.id))]
  return <section aria-label="Resume library" className="resume-library no-print">
    <div className="resume-library-row">
      <label className="resume-library-select">Resume<select aria-label="Active resume" disabled={busy} value={activeDocument?.id || ''} onChange={event => { setConfirmDelete(false); onSelect(event.target.value) }}>
        {!activeDocument && <option value="">Select a resume</option>}
        {documents.map(document => <option key={document.id} value={document.id}>{drafts[document.id]?.name || document.name}{drafts[document.id] ? ' *' : ''}</option>)}
      </select></label>
      <button className="resume-command" disabled={busy} onClick={() => onCreate('blank')}><Plus size={16} />Blank</button>
      <select aria-label="Create sample" disabled={busy} value="" onChange={event => onCreate('sample', event.target.value)}><option value="">Sample</option><option value="en">English sample</option><option value="zh">Chinese sample</option></select>
      <IconButton icon={Copy} label="Duplicate resume" disabled={busy || !activeDocument} onClick={onDuplicate} />
      <IconButton icon={Trash2} label="Delete resume" disabled={busy || !activeDocument} onClick={() => setConfirmDelete(true)} />
    </div>
    {activeDocument && <div className="resume-library-row">
      <label className="resume-library-name">Document name<input value={activeDocument.name} onChange={event => onRename(event.target.value)} /></label>
      <details className="resume-version-menu"><summary>Versions ({versions.length})</summary><div>
        <label>Version label<input value={versionLabel} onChange={event => setVersionLabel(event.target.value)} /></label>
        <button className="resume-command" disabled={busy || !versionLabel.trim()} onClick={async () => { if (await onVersion(versionLabel)) setVersionLabel('') }}><Save size={16} />Save version</button>
        {versions.map(version => <div className="resume-version-row" key={version.id}><span>{version.label}<small>{new Date(version.createdAt).toLocaleString()}</small></span><IconButton icon={RotateCcw} label={`Restore ${version.label}`} disabled={busy} onClick={() => onRestore(version.id)} /></div>)}
      </div></details>
    </div>}
    {confirmDelete && <div className="resume-delete-confirm" role="alert"><span>Delete {activeDocument?.name}? Unsaved changes will be lost.</span><button className="resume-command" onClick={async () => { await onDelete(); setConfirmDelete(false) }} disabled={busy}>Delete</button><button className="resume-command" onClick={() => setConfirmDelete(false)}>Cancel</button></div>}
  </section>
}
