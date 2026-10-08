import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Copy, Download, EyeOff, GripVertical, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import ResumeSection from './ResumeSection'
import ResumeProfile from './ResumeProfile'
import { readResumeImage, safeImageUrl } from './projectImages.js'

export const RESUME_MODULES = [
  { key: 'summary', title: 'Summary' },
  { key: 'education', title: 'Education' },
  { key: 'work', title: 'Work Experience' },
  { key: 'skills', title: 'Skills' },
  { key: 'certificates', title: 'Certificate & Reputation' },
  { key: 'projects', title: 'Projects & Achievements' },
  { key: 'publications', title: 'Publications' },
  { key: 'posters', title: 'Poster & Presentation' },
  { key: 'patents', title: 'Patents' },
]

export const FIELD_SCHEMAS = {
  general: ['name', 'headline', 'location', 'photo', 'address', 'email_work', 'email_private', 'tel', 'banner'],
  education: ['degree', 'major', 'institution', 'date', 'year'],
  work: ['title', 'company', 'location', 'date', 'details'],
  skills: ['value'],
  certificates: ['title', 'organization', 'date'],
  projects: ['title', 'description', 'image', 'link', 'projectNumber'],
  publications: ['type', 'title', 'authors', 'journal', 'link'],
  posters: ['title', 'authors', 'event', 'conference', 'date', 'link'],
  patents: ['title', 'authors', 'link'],
}
const titleFor = key => RESUME_MODULES.find(module => module.key === key)?.title || 'Profile'
const clone = value => JSON.parse(JSON.stringify(value))
const emptyItem = key => key === 'skills' ? '' : Object.fromEntries((FIELD_SCHEMAS[key] || []).filter(field => field !== 'projectNumber').map(field => [field, field === 'details' ? [] : '']))

export function IconButton({ label, icon: Icon, ...props }) {
  return <button type="button" className="resume-icon" title={label} aria-label={label} {...props}><Icon size={16} /></button>
}

function ImageField({ id, value, onChange }) {
  const [error, setError] = useState('')
  return <div className="resume-image-field">
    <input id={id} value={value} placeholder="https://" onChange={event => { setError(''); onChange(event.target.value) }} onBlur={() => setError(value && !safeImageUrl(value) ? 'Use an HTTPS image URL or upload a raster image.' : '')} />
    {safeImageUrl(value) && <img src={safeImageUrl(value)} alt="Image preview" />}
    <div className="flex flex-wrap gap-2 items-center">
      <input aria-label="Upload image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={async event => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return
        try { onChange(await readResumeImage(file)); setError('') } catch (cause) { setError(cause.message) }
      }} />
      <IconButton label="Clear image" icon={Trash2} onClick={() => { onChange(''); setError('') }} />
    </div>
    {error && <p role="alert">{error}</p>}
  </div>
}

export function ModuleEditDrawer({ sectionKey, data, selectedField, selectedIndex, onClose = () => {}, onUpdateField = () => {}, onTitle = () => {}, onSave = () => {}, onExportPdf = () => {}, onAdd = () => {}, onDelete = () => {}, onDuplicate = () => {}, onMove = () => {} }) {
  const panel = useRef(null)
  const dragIndex = useRef(null)
  useEffect(() => {
    const previous = document.activeElement
    const target = panel.current?.querySelector(`[data-field="${selectedField || 'sectionTitle'}"][data-index="${selectedIndex ?? 0}"] input, [data-field="${selectedField || 'sectionTitle'}"][data-index="${selectedIndex ?? 0}"] textarea`)
    ;(target || panel.current?.querySelector('input, textarea, button'))?.focus()
    return () => previous?.focus?.()
  }, [sectionKey, selectedField, selectedIndex])
  if (!sectionKey) return null
  const items = sectionKey === 'general' ? [{ ...data.general, banner: data.banner }] : sectionKey === 'summary' ? [{ summary: data.summary }] : data[sectionKey] || []
  const fields = sectionKey === 'summary' ? ['summary'] : FIELD_SCHEMAS[sectionKey] || []
  const input = (item, index, field) => {
    const value = field === 'value' ? item : item[field] ?? ''
    const id = `resume-${sectionKey}-${index}-${field}`
    const change = value => onUpdateField(index, field === 'value' ? '' : field, field === 'details' ? value.split('\n') : field === 'projectNumber' ? (value === '' ? undefined : Number(value)) : value)
    return <div key={field} data-field={field} data-index={index} className="resume-drawer-field"><label htmlFor={id}>{field.replaceAll('_', ' ')}</label>
      {['image', 'photo', 'banner'].includes(field) ? <ImageField id={id} value={value} onChange={change} />
        : ['details', 'description', 'summary', 'value', 'authors'].includes(field) ? <textarea id={id} rows={field === 'summary' ? 6 : 3} value={Array.isArray(value) ? value.join('\n') : value} onChange={event => change(event.target.value)} />
          : <input id={id} type={field === 'projectNumber' ? 'number' : 'text'} min={field === 'projectNumber' ? 1 : undefined} value={value} onChange={event => change(event.target.value)} />}
    </div>
  }
  return <div className="resume-drawer-backdrop no-print" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <aside ref={panel} role="dialog" aria-modal="true" aria-label={`${titleFor(sectionKey)} module editor`} className={`resume-drawer resume-drawer-${sectionKey}`} onKeyDown={event => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'Tab') {
        const nodes = [...panel.current.querySelectorAll('button:not(:disabled), input, textarea, select, a[href]')]
        const first = nodes[0]; const last = nodes.at(-1)
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }
    }}>
      <header><div><small>Module editor</small><h2>{titleFor(sectionKey)}</h2></div><IconButton label="Close module editor" icon={X} onClick={onClose} /></header>
      {sectionKey !== 'general' && <div className="resume-drawer-field" data-field="sectionTitle" data-index="0"><label htmlFor="resume-section-title">Section title</label><input id="resume-section-title" value={data.sectionTitles?.[sectionKey] ?? titleFor(sectionKey)} onChange={event => onTitle(event.target.value)} /></div>}
      {items.map((item, index) => <section key={index} data-entry-index={index} className="resume-drawer-entry" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (dragIndex.current !== null) onMove(dragIndex.current, index); dragIndex.current = null }}>
        {!['general', 'summary'].includes(sectionKey) && <div className="resume-entry-tools"><span>Entry {index + 1}</span>
          <IconButton label={`Drag entry ${index + 1}`} icon={GripVertical} draggable onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); dragIndex.current = index }} onPointerUp={event => { const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-entry-index]'); if (target && dragIndex.current !== null) onMove(dragIndex.current, Number(target.dataset.entryIndex)); dragIndex.current = null }} onPointerCancel={() => { dragIndex.current = null }} onDragStart={event => { dragIndex.current = index; event.dataTransfer.setData('text/plain', String(index)) }} onDragEnd={() => { dragIndex.current = null }} />
          <IconButton label={`Move entry ${index + 1} up`} icon={ArrowUp} disabled={index === 0} onClick={() => onMove(index, index - 1)} />
          <IconButton label={`Move entry ${index + 1} down`} icon={ArrowDown} disabled={index === items.length - 1} onClick={() => onMove(index, index + 1)} />
          <IconButton label={`Duplicate entry ${index + 1}`} icon={Copy} onClick={() => onDuplicate(index)} />
          <IconButton label={`Delete entry ${index + 1}`} icon={Trash2} onClick={() => onDelete(index)} />
        </div>}
        <div className="resume-field-grid">{fields.filter(field => field !== 'projectNumber' || item.projectNumber).map(field => input(item, index, field))}</div>
      </section>)}
      {!['general', 'summary'].includes(sectionKey) && <button className="resume-command" onClick={onAdd}><Plus size={16} />Add entry</button>}
      <footer><button className="resume-command" onClick={onSave}><Save size={16} />Save draft</button><button className="resume-command" onClick={onExportPdf}><Download size={16} />Export PDF</button></footer>
    </aside>
  </div>
}

export default function EditableResumeShell({ document: controlledDocument, onChange, data, initiallyEditing = false, initiallySelectedSection = null, careerConsoleAvailable = false, onExportPdf = () => {}, onSave = () => {}, onSync = () => {}, canEdit = true, dirty = false, busy = false, showProfile = false }) {
  const [fallback, setFallback] = useState(() => ({ resume: clone(data || {}), theme: 'default', sectionOrder: RESUME_MODULES.map(module => module.key), hiddenSections: [] }))
  const active = controlledDocument || fallback
  const change = next => onChange ? onChange(next) : setFallback(next)
  const [editing, setEditing] = useState(initiallyEditing)
  const [selected, setSelected] = useState(initiallySelectedSection ? { key: initiallySelectedSection } : null)
  const dragged = useRef(null)
  const resume = active.resume
  const order = active.sectionOrder || RESUME_MODULES.map(module => module.key)
  const hidden = active.hiddenSections || []
  const edit = (key, index, field) => setSelected({ key, index, field })
  const updateResume = next => change({ ...active, resume: next })
  const updateField = (index, field, value) => {
    if (selected.key === 'general') return updateResume(field === 'banner' ? { ...resume, banner: value } : { ...resume, general: { ...resume.general, [field]: value } })
    if (selected.key === 'summary') return updateResume({ ...resume, summary: value })
    const items = [...(resume[selected.key] || [])]
    items[index] = field ? { ...items[index], [field]: value } : value
    if (selected.key === 'projects' && field === 'image' && !value) delete items[index].projectNumber
    updateResume({ ...resume, [selected.key]: items })
  }
  const mutateItems = (key, mutate) => { const items = clone(resume[key] || []); mutate(items); updateResume({ ...resume, [key]: items }) }
  const move = (key, to) => { const next = [...order]; const from = next.indexOf(key); if (from < 0 || to < 0 || to >= next.length) return; next.splice(to, 0, next.splice(from, 1)[0]); change({ ...active, sectionOrder: next }) }
  const chrome = (section, content) => <section key={section.key} data-editable-section={section.key} className={`resume-editable-module ${selected?.key === section.key ? 'is-selected' : ''}`} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (dragged.current) move(dragged.current, order.indexOf(section.key)); dragged.current = null }}>
    <div className="resume-module-tools no-print">
      <IconButton label={`Drag handle: ${section.title}`} icon={GripVertical} draggable onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); dragged.current = section.key }} onPointerUp={event => { const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-editable-section]'); if (target && dragged.current) move(dragged.current, order.indexOf(target.dataset.editableSection)); dragged.current = null }} onPointerCancel={() => { dragged.current = null }} onDragStart={event => { dragged.current = section.key; event.dataTransfer.setData('text/plain', section.key) }} onDragEnd={() => { dragged.current = null }} />
      <IconButton label={`Move ${section.title} up`} icon={ArrowUp} disabled={order.indexOf(section.key) === 0} onClick={() => move(section.key, order.indexOf(section.key) - 1)} />
      <IconButton label={`Move ${section.title} down`} icon={ArrowDown} disabled={order.indexOf(section.key) === order.length - 1} onClick={() => move(section.key, order.indexOf(section.key) + 1)} />
      <IconButton label={`Edit module: ${section.title}`} icon={Pencil} onClick={() => edit(section.key)} />
      {section.key !== 'summary' && <IconButton label={`Add ${section.title} entry`} icon={Plus} onClick={() => { mutateItems(section.key, items => items.push(emptyItem(section.key))); edit(section.key, (resume[section.key] || []).length) }} />}
      <IconButton label={`Hide ${section.title}`} icon={EyeOff} onClick={() => change({ ...active, hiddenSections: [...hidden, section.key] })} />
    </div>{content}
  </section>
  return <div className={`resume-theme-${active.theme}`}>
    {canEdit && <div className="resume-editor-toolbar no-print">
      <label className="resume-mode"><input type="checkbox" checked={editing} onChange={event => { setEditing(event.target.checked); setSelected(null) }} />Edit mode</label>
      <select aria-label="Resume theme" value={active.theme} onChange={event => change({ ...active, theme: event.target.value })}>{['default', 'nord', 'monokai', 'github'].map(theme => <option key={theme} value={theme}>{theme}</option>)}</select>
      <button className="resume-command" onClick={onSave} disabled={busy || !dirty}><Save size={16} />Save</button>
      <button className="resume-command" onClick={onExportPdf}><Download size={16} />PDF</button>
      <button className="resume-command" onClick={onSync} disabled={busy}>Sync</button>
      {careerConsoleAvailable && <a className="resume-command" href="/career">Career-Ops</a>}
      <span role="status">{dirty ? 'Unsaved changes' : 'Saved'}</span>
      {editing && hidden.length > 0 && <select aria-label="Add module" value="" onChange={event => change({ ...active, hiddenSections: hidden.filter(key => key !== event.target.value) })}><option value="">Add module</option>{hidden.map(key => <option key={key} value={key}>{titleFor(key)}</option>)}</select>}
    </div>}
    {showProfile && <ResumeProfile resume={resume} editing={canEdit && editing} onSelect={field => edit('general', 0, field)} />}
    <ResumeSection data={resume} sectionOrder={order} hiddenSections={hidden} editing={canEdit && editing} onSelect={edit} renderSectionChrome={canEdit && editing ? chrome : undefined} />
    {canEdit && editing && selected && <ModuleEditDrawer key={selected.key} sectionKey={selected.key} selectedIndex={selected.index} selectedField={selected.field} data={resume} onClose={() => setSelected(null)} onUpdateField={updateField} onTitle={value => updateResume({ ...resume, sectionTitles: { ...resume.sectionTitles, [selected.key]: value } })} onSave={onSave} onExportPdf={onExportPdf}
      onAdd={() => mutateItems(selected.key, items => items.push(emptyItem(selected.key)))}
      onDelete={index => mutateItems(selected.key, items => items.splice(index, 1))}
      onDuplicate={index => mutateItems(selected.key, items => items.splice(index + 1, 0, clone(items[index])))}
      onMove={(from, to) => mutateItems(selected.key, items => { if (to >= 0 && to < items.length) items.splice(to, 0, items.splice(from, 1)[0]) })} />}
  </div>
}
