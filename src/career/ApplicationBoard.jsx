const STATUSES = ['jd_captured', 'generated', 'reviewing', 'ready_to_apply', 'applied', 'follow_up', 'closed']

export default function ApplicationBoard({ rows, selectedSlug, onSelect, onUpdate }) {
  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-lg font-semibold">Application Board</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {rows.map((row) => (
          <article key={row.slug} className={`p-4 ${selectedSlug === row.slug ? 'bg-teal-50' : 'bg-white'}`}>
            <button className="w-full text-left" onClick={() => onSelect(row.slug)}>
              <h3 className="font-semibold text-gray-900">{row.label}</h3>
              <p className="mt-1 text-sm text-gray-600">{row.archetype}</p>
              <p className="mt-2 text-xs text-gray-500">{row.nextAction}</p>
            </button>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Status</span>
                <select
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                  value={row.status}
                  onChange={(event) => onUpdate(row.slug, { status: event.target.value })}
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              {row.pdfPath ? (
                <a className="text-sm text-teal-700 hover:underline" href={row.pdfPath} target="_blank" rel="noreferrer">
                  PDF
                </a>
              ) : (
                <span className="text-sm text-amber-700">PDF missing</span>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
