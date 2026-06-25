import { marked } from 'marked'

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function isSafeUrl(value) {
  if (!value) return false

  const trimmed = String(value).trim()
  if (!trimmed || trimmed.startsWith('//')) return false
  if (
    trimmed.startsWith('#') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('./') ||
    trimmed.startsWith('../') ||
    trimmed.startsWith('?')
  ) {
    return true
  }

  // eslint-disable-next-line no-control-regex -- Strip encoded/control whitespace before URL scheme checks.
  const normalized = trimmed.replaceAll(/[\u0000-\u001f\u007f\s]+/g, '').toLowerCase()
  const schemeMatch = normalized.match(/^([a-z][a-z0-9+.-]*):/)

  if (!schemeMatch) {
    return true
  }

  return ['http', 'https', 'mailto'].includes(schemeMatch[1])
}

function renderSafeMarkdown(markdown) {
  const renderer = new marked.Renderer()
  const baseLinkRenderer = renderer.link.bind(renderer)
  const baseImageRenderer = renderer.image.bind(renderer)

  renderer.link = function renderLink(token) {
    if (!isSafeUrl(token.href)) {
      return this.parser.parseInline(token.tokens)
    }

    return baseLinkRenderer(token)
  }

  renderer.image = function renderImage(token) {
    if (!isSafeUrl(token.href)) {
      return escapeHtml(token.text || '')
    }

    return baseImageRenderer(token)
  }

  return marked.parse(markdown, { renderer })
}

export default function EvidenceReview({ version }) {
  if (!version) return null

  const safeMarkdown = escapeHtml(version.evaluationMarkdown || 'No evaluation generated yet.')
  const html = renderSafeMarkdown(safeMarkdown)
  const warnings = version.metadata?.truthWarnings || []
  const keywords = version.metadata?.keywords || []

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="text-lg font-semibold">Evidence Review</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {keywords.slice(0, 12).map((keyword) => (
          <span
            key={keyword}
            className="rounded border border-teal-200 bg-teal-50 px-2 py-1 text-xs text-teal-800"
          >
            {keyword}
          </span>
        ))}
      </div>
      {warnings.length > 0 && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
          <h3 className="font-medium text-amber-900">Truth warnings</h3>
          <ul className="mt-2 list-inside list-disc text-sm text-amber-900">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="prose prose-sm mt-4 max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  )
}
