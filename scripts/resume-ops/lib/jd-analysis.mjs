import { MEDICAL_ARCHETYPES } from './taxonomy.mjs';

const KEYWORD_PHRASES = [
  'medical ai',
  'real world evidence',
  'clinical trial start-up',
  'kol engagement',
  ...new Set(MEDICAL_ARCHETYPES.flatMap((item) => item.signals)),
  'healthcare ai',
  'clinical trial',
  'evidence generation',
];

const EXCLUDED_KEYWORDS = new Set(['kol']);

export function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function detectArchetypes(jdText) {
  const normalized = normalizeText(jdText);
  return MEDICAL_ARCHETYPES
    .map((archetype) => {
      const matchedSignals = archetype.signals.filter((signal) => normalized.includes(signal.toLowerCase()));
      return {
        id: archetype.id,
        label: archetype.label,
        score: matchedSignals.length,
        matchedSignals,
      };
    })
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
}

export function extractKeywords(jdText, limit = 12) {
  const normalized = normalizeText(jdText);
  const keywords = [];

  for (const phrase of KEYWORD_PHRASES) {
    const normalizedPhrase = phrase.toLowerCase();
    if (EXCLUDED_KEYWORDS.has(normalizedPhrase)) {
      continue;
    }
    if (normalized.includes(normalizedPhrase) && !keywords.includes(normalizedPhrase)) {
      keywords.push(normalizedPhrase);
    }
  }

  return keywords.slice(0, limit);
}

export function inferRoleLabel(jdText) {
  const firstHeading = String(jdText || '').split('\n').map((line) => line.trim()).find((line) => line && line.length < 120);
  return firstHeading ? firstHeading.replace(/^#+\s*/, '') : 'Medical Digital Role';
}

export function analyzeJD(jdText) {
  const archetypes = detectArchetypes(jdText);
  return {
    roleLabel: inferRoleLabel(jdText),
    archetypes,
    keywords: extractKeywords(jdText, 12),
    domainSignals: archetypes.flatMap((match) => match.matchedSignals),
  };
}
