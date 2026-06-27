import { useMemo, useState } from 'react'
import { CheckCircle2, Copy } from 'lucide-react'

function slugify(value) {
  return (
    String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'new-role-slug'
  )
}

async function copyToClipboard(text) {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return false
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export default function JdIntakeHelper({ selectedSlug = 'new-role-slug' }) {
  const [roleTitle, setRoleTitle] = useState(selectedSlug)
  const [company, setCompany] = useState('')
  const [jdText, setJdText] = useState('')
  const [copied, setCopied] = useState('')
  const slug = useMemo(() => slugify([company, roleTitle].filter(Boolean).join(' ')), [company, roleTitle])
  const jdPath = `career/jds/${slug}.md`
  const commands = [
    `npm run resume:adapt -- --jd ${jdPath} --slug ${slug}`,
    `npm run resume:pdf -- --slug ${slug}`,
    'npm run resume:manifest',
  ]

  const copyText = async (label, text) => {
    const ok = await copyToClipboard(text)
    setCopied(ok ? `${label} copied` : 'Clipboard unavailable')
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-teal-700">JD Workflow</p>
          <h2 className="mt-1 text-lg font-semibold">Prepare a local tailored resume version</h2>
          <p className="mt-2 text-sm text-gray-600">
            Build the JD file path and commands visually. File save and command execution remain manual in this MVP.
          </p>
        </div>
        <button
          type="button"
          onClick={() => copyText('Commands', commands.join('\n'))}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Copy className="h-4 w-4" />
          Copy commands
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block text-sm font-medium text-gray-700">
          Company
          <input
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="Varian"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Role title
          <input
            value={roleTitle}
            onChange={(event) => setRoleTitle(event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="Medical AI Product Lead"
          />
        </label>
      </div>

      <label className="mt-4 block text-sm font-medium text-gray-700">
        JD text
        <textarea
          value={jdText}
          onChange={(event) => setJdText(event.target.value)}
          rows={5}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          placeholder="Paste the JD here for local drafting context."
        />
      </label>

      <div className="mt-4 rounded-md bg-gray-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <code className="text-sm text-gray-800">{jdPath}</code>
          <button
            type="button"
            onClick={() => copyText('JD path', jdPath)}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-white"
          >
            <Copy className="h-4 w-4" />
            Copy path
          </button>
        </div>
        <ol className="mt-4 space-y-2 text-sm text-gray-700">
          {commands.map((command) => (
            <li key={command} className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
              <span>
                <span className="font-medium">Manual command step:</span> <code>{command}</code>
              </span>
            </li>
          ))}
        </ol>
      </div>

      {jdText && <p className="mt-3 text-xs text-gray-500">{jdText.length} JD characters held locally in this browser session.</p>}
      {copied && <p className="mt-3 text-xs text-gray-500">{copied}</p>}
    </section>
  )
}
