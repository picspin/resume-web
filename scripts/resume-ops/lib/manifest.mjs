const PRIVATE_RESUME_FIELDS = new Set([
  'truthWarnings',
  'evaluationMarkdown',
  'jdText',
  'applicationNotes',
  'applicationUrl',
  'privateNotes',
  'reviewNotes',
  'coverLetter',
  'sourceJdText',
]);

function sanitizePublicResume(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizePublicResume(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !PRIVATE_RESUME_FIELDS.has(key))
      .map(([key, nestedValue]) => [key, sanitizePublicResume(nestedValue)]),
  );
}

export function buildManifestEntry({ slug, metadata, resume, evaluationMarkdown = '' }) {
  const publicEntry = {
    slug,
    label: metadata.roleLabel || slug,
    archetype: metadata.archetypes?.[0]?.label || 'Medical Role',
    generatedAt: metadata.generatedAt,
    pdfPath: metadata.pdf?.publicPath || '',
    resume: sanitizePublicResume(resume),
  };

  const careerEntry = {
    ...publicEntry,
    resume,
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
