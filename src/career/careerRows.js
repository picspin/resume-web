const NEXT_ACTION_BY_STATUS = {
  jd_captured: 'Generate resume',
  generated: 'Review evidence',
  reviewing: 'Resolve gaps',
  ready_to_apply: 'Submit manually',
  applied: 'Follow up',
  follow_up: 'Track response',
  closed: 'Archive',
};

export function deriveCareerRows({ versions = [], applicationState = {} } = {}) {
  return versions.map((version) => {
    const saved = applicationState[version.slug] || {};
    const status = saved.status || 'generated';
    return {
      ...version,
      ...Object.fromEntries(['status', 'applicationUrl', 'notes', 'updatedAt'].filter((key) => key in saved).map((key) => [key, saved[key]])),
      status,
      hasPdf: Boolean(version.pdfPath),
      nextAction: NEXT_ACTION_BY_STATUS[status] || 'Review evidence',
    };
  });
}

export function getDefaultApplyDraft(version) {
  const label = version?.label || version?.roleTitle || 'the role';
  // Only the selected Job's result or captured source is evidence for a draft.
  const resume = version?.resume ?? version?.sourceDocument?.resume;
  const summary = typeof resume?.summary === 'string' ? resume.summary.trim() : '';
  const name = typeof resume?.general?.name === 'string' ? resume.general.name.trim() : '';
  const evidence = summary ? ` ${summary}` : '';

  return {
    hrMessage: `Hello, I am interested in ${label}.${evidence}`,
    linkedInMessage: `Hello, I noticed the ${label} opening and would value the chance to connect.${evidence}`,
    emailBody: `Dear Hiring Team,\n\nI am writing to apply for ${label}.${evidence}\n\nBest regards,${name ? `\n${name}` : ''}`,
  };
}
