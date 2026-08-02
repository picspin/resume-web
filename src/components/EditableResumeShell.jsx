import { useMemo, useState } from 'react'
import { Copy, GripVertical, Plus, RefreshCw, Save, Trash2, Wand2, X } from 'lucide-react'
import ResumeSection from './ResumeSection'
import {
  addResumeItem,
  createEditableResume,
  removeResumeItem,
  saveResumeWorkbenchDraft,
  updateResumeItemField,
} from '../career/resumeWorkbenchState.js'

export const RESUME_MODULES = [
  { key: 'education', title: 'Education' },
  { key: 'work', title: 'Work Experience' },
  { key: 'skills', title: 'Skills' },
  { key: 'certificates', title: 'Certificate & Reputation' },
  { key: 'projects', title: 'Projects & Achievements' },
  { key: 'publications', title: 'Publications' },
  { key: 'posters', title: 'Poster & Presentation' },
  { key: 'patents', title: 'Patents' },
]

const AI_MODULES = new Set(['work', 'skills', 'projects'])

const FIELD_SCHEMAS = {
  education: ['degree', 'major', 'institution', 'date', 'year'],
  work: ['title', 'company', 'location', 'date', 'details'],
  skills: ['value'],
  certificates: ['title', 'organization', 'date'],
  projects: ['title', 'description', 'image', 'url'],
  publications: ['title', 'journal', 'link'],
  posters: ['title', 'authors', 'event'],
  patents: ['title', 'authors', 'link'],
}

const EMPTY_ITEMS = {
  education: { degree: '', major: '', institution: '', date: '', year: '' },
  work: { title: '', company: '', location: '', date: '', details: [''] },
  skills: 'Medical AI & Digital Health: ',
  certificates: { title: '', organization: '', date: '' },
  projects: { title: '', description: '', image: '/images/projects/fallback.jpg', url: '' },
  publications: { title: '', journal: '', link: '' },
  posters: { title: '', authors: '', event: '' },
  patents: { title: '', authors: '', link: '' },
}

const RESUME_THEMES = [
  { key: 'github', label: 'GitHub' },
  { key: 'nord', label: 'Nord' },
  { key: 'monokai', label: 'Monokai' },
]

function getModuleTitle(sectionKey) {
  return RESUME_MODULES.find((module) => module.key === sectionKey)?.title || 'Resume module'
}

function getSectionItems(data, sectionKey) {
  const items = data?.[sectionKey]
  return Array.isArray(items) ? items : []
}

function normalizeDrawerFieldValue(field, value) {
  if (field === 'details') {
    return String(value)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
  }
  return value
}

function FieldInput({ sectionKey, item, field, itemIndex, onUpdateField }) {
  const id = `${sectionKey}-${itemIndex}-${field}`
  const value = field === 'value'
    ? String(item || '')
    : Array.isArray(item?.[field])
      ? item[field].join('\n')
      : String(item?.[field] || '')
  const isLong = field === 'details' || field === 'description' || value.length > 96

  return (
    <label htmlFor={id} className="block text-xs font-medium text-gray-600 dark:text-gray-300">
      {field === 'value' ? getModuleTitle(sectionKey) : field.replace(/^\w/, (letter) => letter.toUpperCase())}
      {isLong ? (
        <textarea
          id={id}
          rows={field === 'details' || field === 'description' ? 4 : 3}
          value={value}
          onChange={(event) => onUpdateField(itemIndex, field === 'value' ? '' : field, normalizeDrawerFieldValue(field, event.target.value))}
          className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        />
      ) : (
        <input
          id={id}
          value={value}
          onChange={(event) => onUpdateField(itemIndex, field === 'value' ? '' : field, event.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        />
      )}
    </label>
  )
}

function AIOptimizationBlock({ sectionKey }) {
  if (!AI_MODULES.has(sectionKey)) return null

  return (
    <section className="mt-5 rounded-lg border border-dashed border-blue-300 bg-blue-50 p-4 text-sm text-blue-950 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-100">
      <div className="flex items-center gap-2 font-semibold">
        <Wand2 className="h-4 w-4" />
        AI optimization
      </div>
      <p className="mt-2 text-xs leading-relaxed">
        Import from Studio or Prompts, review the wording here, then save the local draft before rendering a tailored resume.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="rounded-md border border-blue-300 bg-white px-3 py-2 text-xs font-medium text-blue-800 hover:bg-blue-50">
          Import from Studio
        </button>
        <button type="button" className="rounded-md border border-blue-300 bg-white px-3 py-2 text-xs font-medium text-blue-800 hover:bg-blue-50">
          Fill from Prompts
        </button>
      </div>
    </section>
  )
}

export function ModuleEditDrawer({
  sectionKey,
  data,
  onClose = () => {},
  onUpdateField = () => {},
  onSave = () => {},
  onExportPdf = () => {},
}) {
  if (!sectionKey) return null

  const fields = FIELD_SCHEMAS[sectionKey] || []
  const items = getSectionItems(data, sectionKey)

  return (
    <aside
      className="fixed right-0 top-0 z-40 h-full w-full max-w-md overflow-y-auto border-l border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
      aria-label={`${getModuleTitle(sectionKey)} module editor`}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-blue-700 dark:text-blue-300">Module editor</p>
          <h2 className="mt-1 text-xl font-semibold text-gray-950 dark:text-gray-50">{getModuleTitle(sectionKey)}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close module editor"
          className="rounded-md border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
            No entries yet. Add one from the module controls on the resume canvas.
          </div>
        ) : (
          items.map((item, itemIndex) => (
            <section key={`${sectionKey}-${itemIndex}`} className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Entry {itemIndex + 1}</span>
                <span className="text-xs text-gray-400">review before save</span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {fields.map((field) => (
                  <FieldInput
                    key={field}
                    sectionKey={sectionKey}
                    item={item}
                    field={field}
                    itemIndex={itemIndex}
                    onUpdateField={onUpdateField}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      <AIOptimizationBlock sectionKey={sectionKey} />

      <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
        <button
          type="button"
          onClick={onSave}
          className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          <Save className="h-4 w-4" />
          Save local draft
        </button>
        <button type="button" className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800">
          <RefreshCw className="h-4 w-4" />
          Re-render preview
        </button>
        <button
          type="button"
          onClick={onExportPdf}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          Export PDF
        </button>
      </div>
    </aside>
  )
}

export default function EditableResumeShell({
  data,
  initiallyEditing = false,
  initiallySelectedSection = null,
  careerConsoleAvailable = false,
  portfolioDraft = null,
  onExportPdf = () => {},
}) {
  const [editing, setEditing] = useState(initiallyEditing)
  const [selectedSection, setSelectedSection] = useState(initiallySelectedSection)
  const [resumeDraft, setResumeDraft] = useState(() => createEditableResume(data))
  const [sectionOrder, setSectionOrder] = useState(RESUME_MODULES.map((module) => module.key))
  const [themeIndex, setThemeIndex] = useState(0)

  const visibleResume = useMemo(() => createEditableResume(resumeDraft || data), [resumeDraft, data])
  const activeTheme = RESUME_THEMES[themeIndex] || RESUME_THEMES[0]

  const closeDrawer = () => setSelectedSection(null)

  const addItem = (sectionKey) => {
    setResumeDraft((current) => addResumeItem(current, sectionKey, EMPTY_ITEMS[sectionKey] ?? {}))
    setSelectedSection(sectionKey)
  }

  const duplicateFirstItem = (sectionKey) => {
    const [firstItem] = getSectionItems(visibleResume, sectionKey)
    setResumeDraft((current) => addResumeItem(current, sectionKey, firstItem || EMPTY_ITEMS[sectionKey] || {}))
    setSelectedSection(sectionKey)
  }

  const deleteLastItem = (sectionKey) => {
    const items = getSectionItems(visibleResume, sectionKey)
    if (items.length === 0) return
    setResumeDraft((current) => removeResumeItem(current, sectionKey, items.length - 1))
    setSelectedSection(sectionKey)
  }

  const updateField = (sectionKey, itemIndex, fieldPath, value) => {
    setResumeDraft((current) => updateResumeItemField(current, sectionKey, itemIndex, fieldPath, value))
  }

  const moveSection = (sectionKey, direction) => {
    setSectionOrder((current) => {
      const next = [...current]
      const index = next.indexOf(sectionKey)
      const target = index + direction
      if (index < 0 || target < 0 || target >= next.length) return current
      const [removed] = next.splice(index, 1)
      next.splice(target, 0, removed)
      return next
    })
  }

  const renderSectionChrome = (section, renderedSection) => (
    <section
      key={section.key}
      data-editable-section={section.key}
      className={`group relative rounded-2xl border border-dashed p-1 transition ${
        selectedSection === section.key
          ? 'border-blue-500 ring-2 ring-blue-400/60'
          : 'border-blue-300/80 hover:border-blue-500'
      }`}
    >
      <div className="absolute -left-10 top-8 hidden flex-col gap-2 lg:flex">
        <button
          type="button"
          aria-label={`Move ${section.title} up`}
          onClick={() => moveSection(section.key, -1)}
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600 shadow-sm hover:bg-gray-50"
        >
          ↑
        </button>
        <span className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600 shadow-sm">
          <GripVertical className="h-3.5 w-3.5" />
          Drag handle
        </span>
        <button
          type="button"
          aria-label={`Move ${section.title} down`}
          onClick={() => moveSection(section.key, 1)}
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600 shadow-sm hover:bg-gray-50"
        >
          ↓
        </button>
      </div>
      <div className="absolute right-4 top-4 z-10 hidden flex-wrap gap-2 group-hover:flex group-focus-within:flex">
        <button
          type="button"
          onClick={() => setSelectedSection(section.key)}
          className="rounded-md bg-blue-700 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-800"
        >
          Edit module
        </button>
        <button
          type="button"
          onClick={() => duplicateFirstItem(section.key)}
          className="rounded-md border border-gray-300 bg-white p-1.5 text-gray-600 shadow-sm hover:bg-gray-50"
          aria-label={`Duplicate ${section.title}`}
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => deleteLastItem(section.key)}
          className="rounded-md border border-gray-300 bg-white p-1.5 text-gray-600 shadow-sm hover:bg-gray-50"
          aria-label={`Delete ${section.title} entry`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => addItem(section.key)}
          className="rounded-md border border-gray-300 bg-white p-1.5 text-gray-600 shadow-sm hover:bg-gray-50"
          aria-label={`Add ${section.title} entry`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      {renderedSection}
    </section>
  )

  const saveDraft = () => {
    saveResumeWorkbenchDraft(visibleResume)
  }

  return (
    <div className={`resume-theme-${activeTheme.key} ${activeTheme.key === 'github' ? '' : 'rounded-2xl p-2'}`}>
      <div className="no-print sticky top-3 z-30 mb-6 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setEditing((value) => !value)
            if (editing) closeDrawer()
          }}
          className={`rounded-md border px-3 py-2 text-sm font-medium shadow-sm transition ${
            editing
              ? 'border-blue-700 bg-blue-700 text-white'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'
          }`}
          aria-pressed={editing}
        >
          Edit Mode {editing ? 'ON' : 'OFF'}
        </button>
        <button
          type="button"
          onClick={() => setThemeIndex((value) => (value + 1) % RESUME_THEMES.length)}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          Theme: {activeTheme.label}
        </button>
        <button
          type="button"
          onClick={saveDraft}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          Save draft
        </button>
        <button
          type="button"
          onClick={onExportPdf}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          Export PDF
        </button>
        {careerConsoleAvailable && (
          <a
            href="/career"
            className="rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-800"
          >
            Career-Ops
          </a>
        )}
      </div>

      <ResumeSection
        data={visibleResume}
        sectionOrder={sectionOrder}
        renderSectionChrome={editing ? renderSectionChrome : undefined}
      />

      {editing && selectedSection && (
        <ModuleEditDrawer
          sectionKey={selectedSection}
          data={visibleResume}
          onClose={closeDrawer}
          onSave={saveDraft}
          onExportPdf={onExportPdf}
          onUpdateField={(itemIndex, fieldPath, value) => updateField(selectedSection, itemIndex, fieldPath, value)}
          portfolioDraft={portfolioDraft}
        />
      )}
    </div>
  )
}
