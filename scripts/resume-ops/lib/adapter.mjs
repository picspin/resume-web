function scoreText(text, keywords) {
  const normalized = String(text || '').toLowerCase();
  return keywords.reduce((score, keyword) => score + (normalized.includes(String(keyword).toLowerCase()) ? 1 : 0), 0);
}

function rankItems(items, keywords, getText) {
  return [...(items || [])]
    .map((item, index) => ({ item, index, score: scoreText(getText(item), keywords) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.item);
}

function buildSummary(masterResume, jdAnalysis) {
  const archetypeLabel = jdAnalysis.archetypes?.[0]?.label || 'Medical Digital Role';
  const keywordText = (jdAnalysis.keywords || []).slice(0, 5).join(', ');
  return `${masterResume.summary} Target framing for ${archetypeLabel}: emphasizes ${keywordText} through existing medical imaging, healthcare digitalization, AI/ML, and China/APAC implementation evidence.`;
}

export function adaptResume(masterResume, jdAnalysis) {
  const keywords = jdAnalysis.keywords || [];
  const rankedWork = rankItems(masterResume.work, keywords, (job) => [job.title, job.company, ...(job.details || [])].join(' '));
  const rankedProjects = rankItems(masterResume.projects, keywords, (project) => [project.title, project.description].join(' '));

  const resume = {
    ...masterResume,
    summary: buildSummary(masterResume, jdAnalysis),
    work: rankedWork,
    projects: rankedProjects.slice(0, 6),
    targetedRole: jdAnalysis.roleLabel,
    targetedKeywords: keywords,
  };

  return {
    resume,
    metadata: {
      roleLabel: jdAnalysis.roleLabel,
      archetypes: jdAnalysis.archetypes || [],
      keywords,
      generatedAt: new Date().toISOString(),
      rewritePolicy: 'truth-based-reorder-and-reframe',
      selectedProjects: resume.projects.map((project) => project.title).filter(Boolean),
      truthWarnings: [
        'Do not claim direct radiation therapy product ownership unless later source evidence supports it.',
        'Do not claim NMPA registration leadership unless later source evidence supports it.',
        'Do not claim clinical trial start-up ownership, CTA/NDA ownership, signed-deal ownership, or line-management scope unless later source evidence supports it.',
      ],
    },
  };
}
