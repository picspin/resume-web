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

function phraseTokens(phrase) {
  return normalizeText(phrase).match(/[a-z0-9]+/g) || [];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function matchesPhrase(text, phrase) {
  const tokens = phraseTokens(phrase);
  if (tokens.length === 0) {
    return false;
  }

  const pattern = tokens.map(escapeRegExp).join('[^a-z0-9]+');
  return new RegExp(`(^|[^a-z0-9])${pattern}($|[^a-z0-9])`, 'i').test(String(text || ''));
}

function scoreSignal(jdText, titleText, signal) {
  if (!matchesPhrase(jdText, signal)) {
    return 0;
  }

  return matchesPhrase(titleText, signal) ? 4 : 1;
}

export function detectArchetypes(jdText) {
  const titleText = inferRoleLabel(jdText);
  const normalized = normalizeText(jdText);
  return MEDICAL_ARCHETYPES
    .map((archetype) => {
      const matchedSignals = archetype.signals.filter((signal) => matchesPhrase(normalized, signal));
      return {
        id: archetype.id,
        label: archetype.label,
        score: matchedSignals.reduce((sum, signal) => sum + scoreSignal(normalized, titleText, signal), 0),
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
    if (matchesPhrase(normalized, normalizedPhrase) && !keywords.includes(normalizedPhrase)) {
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
