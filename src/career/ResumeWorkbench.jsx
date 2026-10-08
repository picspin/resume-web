import { Plus, Printer, RotateCcw, Save, Trash2, Wand2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import ResumeSection from '../components/ResumeSection'
import {
  addResumeItem,
  applyDraftProject,
  applyDraftSkills,
  clearResumeWorkbenchDraft,
  createEditableResume,
  loadResumeWorkbenchDraft,
  removeResumeItem,
  saveResumeWorkbenchDraft,
  updateResumeItemField,
} from './resumeWorkbenchState'

const SECTION_DEFINITIONS = [
  {
    key: 'education',
    title: 'Education',
    template: { degree: '', major: '', institution: '', date: '', year: '' },
    fields: ['degree', 'major', 'institution', 'date', 'year'],
  },
  {
    key: 'work',
    title: 'Work Experience',
    template: { title: '', company: '', date: '', location: '', details: [''] },
    fields: ['title', 'company', 'date', 'location', 'details.0'],
  },
  {
    key: 'skills',
    title: 'Skills',
    template: '',
    fields: ['value'],
  },
  {
    key: 'certificates',
    title: 'Certificate & Reputation',
    template: { title: '', organization: '', date: '' },
    fields: ['title', 'organization', 'date'],
  },
  {
    key: 'projects',
    title: 'Projects & Achievements',
    template: { title: '', description: '', image: '' },
    fields: ['title', 'description', 'image'],
    acceptsDraftProject: true,
  },
  {
    key: 'publications',
    title: 'Publications',
    template: { title: '', journal: '', link: '' },
    fields: ['title', 'journal', 'link'],
  },
  {
    key: 'posters',
    title: 'Poster & Presentation',
    template: { title: '', authors: '', event: '' },
    fields: ['title', 'authors', 'event'],
  },
  {
    key: 'patents',
    title: 'Patents',
    template: { title: '', authors: '', link: '' },
    fields: ['title', 'authors', 'link'],
  },
]

function readField(item, field) {
  if (field === 'value') return typeof item === 'string' ? item : ''
  return String(field)
    .split('.')
    .reduce((cursor, segment) => (cursor == null ? '' : cursor[segment]), item) || ''
}

function fieldLabel(field) {
  if (field === 'value') return 'Text'
  return field
    .replace(/\.\d+$/, '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (letter) => letter.toUpperCase())
}

function EditableSection({ definition, items, onAdd, onRemove, onChange, onApplyProjectDrop }) {
  const canDropDraft = definition.acceptsDraftProject

  const handleDragOver = (event) => {
    if (!canDropDraft) return
    event.preventDefault()
  }

  const handleDrop = (event) => {
    if (!canDropDraft) return
    event.preventDefault()
    onApplyProjectDrop()
  }

  return (
    <section
      className="rounded-lg border border-gray-200 bg-white p-4"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-gray-900">{definition.title}</h3>
        <button
          type="button"
          onClick={() => onAdd(definition.key, definition.template)}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-300 px-3 text-sm text-gray-700 hover:bg-gray-50"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-gray-500">
            Empty module. Add an item or apply generated content.
          </div>
        ) : (
          items.map((item, index) => (
            <div key={`${definition.key}-${index}`} className="rounded-md border border-gray-100 bg-gray-50 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Item {index + 1}</span>
                <button
                  type="button"
                  onClick={() => onRemove(definition.key, index)}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-gray-300 px-2 text-xs text-gray-600 hover:bg-white"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {definition.fields.map((field) => {
                  const value = readField(item, field)
                  const multiline = field === 'description' || field === 'details.0' || field === 'value'
                  const inputId = `${definition.key}-${index}-${field}`
                  return (
                    <label key={field} htmlFor={inputId} className="block text-xs font-medium text-gray-600">
                      {fieldLabel(field)}
                      {multiline ? (
                        <textarea
                          id={inputId}
                          value={value}
                          rows={3}
                          onChange={(event) => onChange(definition.key, index, field, event.target.value)}
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                        />
                      ) : (
                        <input
                          id={inputId}
                          value={value}
                          onChange={(event) => onChange(definition.key, index, field, event.target.value)}
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                        />
                      )}
                    </label>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

export default function ResumeWorkbench({ baseResume, portfolioDraft = null }) {
  const initialResume = useMemo(() => {
    const saved = loadResumeWorkbenchDraft()
    return createEditableResume(saved?.resume || baseResume)
  }, [baseResume])
  const [resume, setResume] = useState(initialResume)
  const [status, setStatus] = useState('Draft is local to this browser until you save or export.')

  const applyProject = () => {
    setResume((current) => applyDraftProject(current, portfolioDraft))
    setStatus('Generated project applied to Projects & Achievements.')
  }

  const applySkills = () => {
    setResume((current) => applyDraftSkills(current, portfolioDraft))
    setStatus('Suggested skills applied to Skills.')
  }

  const handleSave = () => {
    setStatus(saveResumeWorkbenchDraft(resume) ? 'Local resume draft saved.' : 'Unable to save local draft.')
  }

  const handleReset = () => {
    clearResumeWorkbenchDraft()
    setResume(createEditableResume(baseResume))
    setStatus('Editor reset to the base resume.')
  }

  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print()
    setStatus('Use the browser print dialog to save the rendered resume as PDF.')
  }

  const handleAdd = (section, template) => {
    setResume((current) => addResumeItem(current, section, template))
  }

  const handleRemove = (section, index) => {
    setResume((current) => removeResumeItem(current, section, index))
  }

  const handleChange = (section, index, field, value) => {
    setResume((current) => updateResumeItemField(current, section, index, field, value))
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-teal-700">Resume WYSIWYG Workbench</p>
          <h2 className="mt-1 text-xl font-semibold">Editable resume canvas</h2>
          <p className="mt-2 max-w-3xl text-sm text-gray-600">
            Edit modules, apply generated projects or skills, preview the live layout, then save a local draft or export to PDF.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Save className="h-4 w-4" />
            Save local draft
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-teal-700 px-3 text-sm font-medium text-white hover:bg-teal-800"
          >
            <Printer className="h-4 w-4" />
            Download PDF
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-md bg-gray-50 p-3 text-sm text-gray-600">{status}</div>

      {portfolioDraft && (
        <div className="mt-4 rounded-md border border-teal-200 bg-teal-50 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-teal-950">Generated content ready</h3>
              <p className="mt-1 text-sm text-teal-800">{portfolioDraft.webProject?.title}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                draggable
                onDragStart={(event) => event.dataTransfer?.setData('text/plain', 'portfolio-project')}
                onClick={applyProject}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-teal-700 px-3 text-sm font-medium text-white hover:bg-teal-800"
              >
                <Wand2 className="h-4 w-4" />
                Apply generated project
              </button>
              <button
                type="button"
                onClick={applySkills}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-teal-700 px-3 text-sm font-medium text-teal-800 hover:bg-white"
              >
                Apply suggested skills
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(360px,0.95fr)_minmax(520px,1.35fr)]">
        <div className="space-y-4">
          {SECTION_DEFINITIONS.map((definition) => (
            <EditableSection
              key={definition.key}
              definition={definition}
              items={resume[definition.key] || []}
              onAdd={handleAdd}
              onRemove={handleRemove}
              onChange={handleChange}
              onApplyProjectDrop={applyProject}
            />
          ))}
        </div>

        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
          <ResumeSection data={resume} />
        </div>
      </div>
    </section>
  )
}
