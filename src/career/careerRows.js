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
      ...saved,
      status,
      hasPdf: Boolean(version.pdfPath),
      nextAction: NEXT_ACTION_BY_STATUS[status] || 'Review evidence',
    };
  });
}

export function getDefaultApplyDraft(version) {
  const label = version?.label || 'the role';
  const summary = version?.resume?.summary || 'my healthcare digital and medical AI background';
  const archetype = version?.archetype || 'medical role';

  return {
    hrMessage: `Hello, I am interested in ${label}. My background combines ${archetype}, medical imaging, healthcare digitalization, and cross-functional China/APAC execution.`,
    linkedInMessage: `Hello, I noticed the ${label} opening and would value the chance to connect. My experience spans medical imaging, digital health, and AI-enabled healthcare solutions.`,
    emailBody: `Dear Hiring Team,\n\nI am writing to apply for ${label}. ${summary}\n\nBest regards,\nXiaolei Zhu`,
  };
}
