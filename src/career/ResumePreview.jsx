import ResumeSection from '../components/ResumeSection'

export default function ResumePreview({ preview }) {
  const bullets = preview?.metadata?.resumeBullets || []
  const warnings = preview?.metadata?.warnings || []

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="mb-5">
        <p className="text-sm font-medium text-teal-700">Resume Preview</p>
        <h2 className="mt-1 text-xl font-semibold">Live web layout preview</h2>
        <p className="mt-2 text-sm text-gray-600">
          This is an in-memory preview only. Source resume files are unchanged.
        </p>
      </div>

      {!preview?.resume ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-600">
          Generate a portfolio draft to preview it in the live resume layout.
        </div>
      ) : (
        <>
          {warnings.length > 0 && (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {warnings.map((warning) => <p key={warning}>{warning}</p>)}
            </div>
          )}

          {bullets.length > 0 && (
            <div className="mb-6 rounded-md bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-800">Draft bullets</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                {bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
              </ul>
            </div>
          )}

          <div className="rounded-md border border-gray-100 bg-gray-50 p-4">
            <ResumeSection data={preview.resume} />
          </div>
        </>
      )}
    </section>
  )
}
