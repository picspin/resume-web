export function buildManifestEntry({ slug, metadata, resume, evaluationMarkdown = '' }) {
  const publicEntry = {
    slug,
    label: metadata.roleLabel || slug,
    archetype: metadata.archetypes?.[0]?.label || 'Medical Role',
    generatedAt: metadata.generatedAt,
    pdfPath: metadata.pdf?.publicPath || '',
    resume,
  };

  const careerEntry = {
    ...publicEntry,
    metadata,
    evaluationMarkdown,
  };

  return { publicEntry, careerEntry };
}

export function buildManifests(versionRecords) {
  const entries = versionRecords.map(buildManifestEntry);
  const sortByGeneratedAt = (a, b) => String(b.generatedAt || '').localeCompare(String(a.generatedAt || ''));

  return {
    publicVersions: entries.map((entry) => entry.publicEntry).sort(sortByGeneratedAt),
    careerVersions: entries.map((entry) => entry.careerEntry).sort(sortByGeneratedAt),
  };
}
