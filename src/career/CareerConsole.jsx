import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, FileText, Send, ShieldCheck } from 'lucide-react'
import { loadCareerVersions } from './careerData'
import { deriveCareerRows } from './careerRows'
import { useApplicationState } from './useApplicationState'
import ApplicationBoard from './ApplicationBoard'
import EvidenceReview from './EvidenceReview'
import ApplyPack from './ApplyPack'
import JdIntakeHelper from './JdIntakeHelper'

export default function CareerConsole() {
  const { applicationState, updateRecord } = useApplicationState()
  const [careerVersions, setCareerVersions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    loadCareerVersions().then((versions) => {
      if (active) {
        setCareerVersions(versions)
        setLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [])

  const rows = useMemo(
    () => deriveCareerRows({ versions: careerVersions, applicationState }),
    [careerVersions, applicationState],
  )
  const [selectedSlug, setSelectedSlug] = useState(rows[0]?.slug || '')
  const selected = rows.find((row) => row.slug === selectedSlug) || rows[0]

  useEffect(() => {
    if (!selectedSlug && rows[0]?.slug) {
      setSelectedSlug(rows[0].slug)
    }
  }, [rows, selectedSlug])

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-6">
          <p className="flex items-center gap-2 text-sm font-medium text-teal-700">
            <ShieldCheck className="h-4 w-4" />
            Local-only workspace
          </p>
          <h1 className="mt-2 text-3xl font-bold">Career Console</h1>
          <p className="mt-2 max-w-3xl text-gray-600">
            Review tailored resume versions, evidence, and manual application packs before submitting anything yourself.
          </p>
        </header>

        <section className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <ClipboardList className="mb-2 h-5 w-5 text-teal-700" />
            <div className="text-2xl font-semibold">{rows.length}</div>
            <div className="text-sm text-gray-600">Generated versions</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <FileText className="mb-2 h-5 w-5 text-teal-700" />
            <div className="text-2xl font-semibold">{rows.filter((row) => row.hasPdf).length}</div>
            <div className="text-sm text-gray-600">PDF ready</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <Send className="mb-2 h-5 w-5 text-teal-700" />
            <div className="text-2xl font-semibold">{rows.filter((row) => row.status === 'applied').length}</div>
            <div className="text-sm text-gray-600">Applied</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <ShieldCheck className="mb-2 h-5 w-5 text-teal-700" />
            <div className="text-2xl font-semibold">Manual</div>
            <div className="text-sm text-gray-600">Submit gate</div>
          </div>
        </section>

        {loading || rows.length === 0 ? (
          <JdIntakeHelper />
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(320px,420px)_1fr]">
            <ApplicationBoard rows={rows} selectedSlug={selected?.slug} onSelect={setSelectedSlug} onUpdate={updateRecord} />
            <div className="space-y-6">
              <EvidenceReview version={selected} />
              <ApplyPack version={selected} onUpdate={updateRecord} />
              <JdIntakeHelper selectedSlug={selected?.slug} />
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
