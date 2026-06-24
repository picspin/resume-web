import { matchesPhrase } from './jd-analysis.mjs';

const KPI_HINTS = {
  'medical-digital-product-marketing': ['adoption velocity', 'launch readiness', 'commercial enablement quality', 'portfolio differentiation'],
  'medical-ai-clinical-workflow': ['clinical workflow fit', 'pilot-to-scale conversion', 'model usability', 'hospital adoption barriers'],
  'healthcare-digital-transformation': ['stakeholder adoption', 'operating model maturity', 'workflow automation coverage', 'change-management risk'],
  'medical-device-portfolio-strategy': ['roadmap-market fit', 'localization risk', 'competitive positioning', 'business-case quality'],
  'clinical-application-scientific-solution': ['KOL engagement quality', 'clinical education depth', 'scientific credibility', 'field enablement'],
  'medical-bd-ecosystem-partnership': ['partner quality', 'pipeline conversion', 'ecosystem leverage', 'joint value proof'],
  'radiology-oncology-commercialization': ['clinical pathway fit', 'department workflow value', 'oncology/radiology stakeholder coverage', 'launch evidence'],
  'pharma-clinical-development-operations': ['study start-up speed', 'site activation quality', 'trial execution risk', 'vendor/CRO governance'],
  'clinical-modeling-rwd-analytics': ['evidence quality', 'data availability', 'model-to-decision translation', 'protocol or enrollment impact'],
  'medical-affairs-ai-integrated-solutions': ['medical strategy fit', 'compliance risk', 'patient outcome narrative', 'cross-functional alignment'],
  'pharma-rd-open-innovation-bd': ['external innovation fit', 'due diligence quality', 'licensing readiness', 'scientific/commercial attractiveness'],
  'medical-ai-evaluation-standards': ['evaluation rigor', 'benchmark relevance', 'committee influence', 'standardization readiness'],
  'medical-device-imaging-rd-innovation': ['clinical requirement clarity', 'verification pathway', 'algorithm-product integration', 'translational value'],
};

const EVIDENCE_ALIASES = {
  'medical ai': ['ai-driven medical imaging', 'artificial intelligence', 'ai algorithms', 'machine learning', 'deep learning'],
  'medical digital': ['digital health', 'digital solutions', 'healthcare digitalization', 'digital healthcare solutions'],
  'medical digital solutions': ['digital health portfolio', 'digital solutions', 'cloud-based imaging service'],
  'digital innovation': ['data-driven innovation', 'digital solution business', 'digital market research platform'],
  'product strategy': ['market strategy', 'product roadmap', 'portfolio strategy', 'product portfolio'],
  'product marketing': ['scientific marketing', 'market promotion', 'sales & marketing', 'market research'],
  'stakeholder adoption': ['stakeholder influence', 'customer-oriented', 'hospital-partner collaboration', 'regional teams'],
  'ai-enabled healthcare': ['ai-driven medical imaging', 'healthcare ai', 'medical imaging solutions'],
  'healthcare digital': ['digital healthcare solutions', 'digital health', 'healthcare digitalization'],
  adoption: ['pilot project', 'promote', 'implementation', 'customer reputation'],
  enablement: ['sales enablement', 'service support', 'customer excellence', 'training'],
};

function textOf(value) {
  return Array.isArray(value) ? value.join(' ') : String(value || '');
}

function clip(value, limit = 170) {
  const text = textOf(value).replace(/\s+/g, ' ').trim();
  return text.length > limit ? `${text.slice(0, limit - 3)}...` : text;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function findEvidence(resume = {}, term) {
  const evidence = [];

  for (const job of resume.work || []) {
    const detail = (job.details || []).find((item) => matchesPhrase(item, term));
    const heading = [job.title, job.company].filter(Boolean).join(' @ ');
    if (detail || matchesPhrase(heading, term)) {
      evidence.push(`Work: ${heading}${detail ? ` - ${clip(detail)}` : ''}`);
    }
  }

  for (const project of resume.projects || []) {
    const text = [project.title, project.description].filter(Boolean).join(' - ');
    if (matchesPhrase(text, term)) {
      evidence.push(`Project: ${clip(text)}`);
    }
  }

  for (const skill of resume.skills || []) {
    if (matchesPhrase(skill, term)) {
      evidence.push(`Skill: ${clip(skill, 120)}`);
    }
  }

  for (const publication of resume.publications || []) {
    const text = [publication.title, publication.journal].filter(Boolean).join(' - ');
    if (matchesPhrase(text, term)) {
      evidence.push(`Publication: ${clip(text)}`);
    }
  }

  return evidence.slice(0, 3);
}

function collectEvidence(resume = {}, requirement) {
  const directEvidence = findEvidence(resume, requirement);
  if (directEvidence.length > 0) {
    return { type: 'direct', evidence: directEvidence };
  }

  for (const alias of EVIDENCE_ALIASES[requirement] || []) {
    const adjacentEvidence = findEvidence(resume, alias);
    if (adjacentEvidence.length > 0) {
      return { type: 'adjacent', alias, evidence: adjacentEvidence };
    }
  }

  return { type: 'gap', evidence: [] };
}

function renderEvidenceRows(resume, requirements) {
  return requirements.map((requirement) => {
    const match = collectEvidence(resume, requirement);
    if (match.type === 'gap') {
      return `- **${requirement}:** Evidence gap or adjacent-only area. Keep wording conservative and do not imply direct ownership.`;
    }
    if (match.type === 'adjacent') {
      return `- **${requirement}:** Adjacent evidence via "${match.alias}" - ${match.evidence.join(' | ')}`;
    }
    return `- **${requirement}:** ${match.evidence.join(' | ')}`;
  });
}

export function renderEvaluation({ jdAnalysis, metadata, resume }) {
  const primary = jdAnalysis.archetypes?.[0];
  const requirements = unique([
    ...(jdAnalysis.keywords || []),
    ...(primary?.matchedSignals || []),
  ]).slice(0, 14);
  const kpiHints = KPI_HINTS[primary?.id] || ['stakeholder fit', 'evidence strength', 'implementation risk', 'business impact'];
  const lines = [
    `# Evaluation: ${metadata.roleLabel}`,
    '',
    `**Generated:** ${metadata.generatedAt}`,
    `**Primary Archetype:** ${primary ? primary.label : 'Unclassified Medical Role'}`,
    `**Keywords:** ${metadata.keywords.join(', ') || 'None detected'}`,
    '',
    '## Block A - Role And Market Context',
    '',
    `This role is framed as ${primary ? primary.label : 'a healthcare role requiring manual review'}. Stakeholders may include clinical, medical affairs, R&D, commercial, access, KOL, hospital, vendor, and regulatory partners depending on the JD.`,
    '',
    '## Block B - Resume Evidence Match',
    '',
    ...renderEvidenceRows(resume, requirements),
    '',
    '## Block C - HR Screen And Level Strategy',
    '',
    '- First-page language should lead with the strongest direct evidence from Block B before adjacent domain expansion.',
    '- HR-facing phrasing should connect healthcare AI, medical imaging, China/APAC localization, scientific credibility, and product/commercial translation without inventing ownership.',
    '',
    '## Block D - Business Impact, KPI, And Industry Insight',
    '',
    ...kpiHints.map((hint) => `- KPI lens: ${hint}.`),
    '',
    '## Block E - Resume, Web, PDF, And LinkedIn Customization Plan',
    '',
    '- Use the generated resume JSON as the first adaptation pass, then tighten bullets where Block B shows direct evidence.',
    '- Keep truth warnings in metadata/review artifacts; external PDF output should not display internal truth notes.',
    '',
    '## Block F - Interview And Narrative Plan',
    '',
    '- Prepare STAR+R stories for cross-functional leadership, medical AI enablement, hospital/KOL collaboration, digital platform strategy, and scientific communication.',
    '',
    '## Block G - Posting Legitimacy',
    '',
    '- URL liveness is not verified by this deterministic local pass. Verify manually or with the separate scanner workflow before prioritizing an application.',
    '',
    '## Truth Warnings',
    '',
    ...metadata.truthWarnings.map((warning) => `- ${warning}`),
    '',
  ];

  return lines.join('\n');
}
