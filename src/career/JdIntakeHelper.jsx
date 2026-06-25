export default function JdIntakeHelper({ selectedSlug = 'new-role-slug' }) {
  const slug = selectedSlug || 'new-role-slug'
  const commands = [
    `npm run resume:adapt -- --jd career/jds/${slug}.md --slug ${slug}`,
    `npm run resume:pdf -- --slug ${slug}`,
    'npm run resume:manifest',
  ]

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="text-lg font-semibold">JD Intake Helper</h2>
      <p className="mt-2 text-sm text-gray-600">
        Save the JD as <code>career/jds/{slug}.md</code>, then run:
      </p>
      <pre className="mt-3 overflow-x-auto rounded-md bg-gray-900 p-4 text-sm text-gray-100">{commands.join('\n')}</pre>
    </section>
  )
}
