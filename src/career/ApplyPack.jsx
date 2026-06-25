import { useMemo } from 'react'
import { getDefaultApplyDraft } from './careerRows'

export default function ApplyPack({ version, onUpdate }) {
  const draft = useMemo(() => getDefaultApplyDraft(version), [version])
  if (!version) return null

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="text-lg font-semibold">Manual Apply Pack</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">Application URL</span>
          <input
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            value={version.applicationUrl || ''}
            onChange={(event) => onUpdate(version.slug, { applicationUrl: event.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Notes</span>
          <input
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            value={version.notes || ''}
            onChange={(event) => onUpdate(version.slug, { notes: event.target.value })}
          />
        </label>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">HR message draft</span>
          <textarea
            className="mt-1 min-h-24 w-full rounded-md border border-gray-300 p-3 text-sm"
            readOnly
            value={draft.hrMessage}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">LinkedIn message draft</span>
          <textarea
            className="mt-1 min-h-24 w-full rounded-md border border-gray-300 p-3 text-sm"
            readOnly
            value={draft.linkedInMessage}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Email body draft</span>
          <textarea
            className="mt-1 min-h-36 w-full rounded-md border border-gray-300 p-3 text-sm"
            readOnly
            value={draft.emailBody}
          />
        </label>
      </div>
    </section>
  )
}
