import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeJD, extractKeywords, matchesPhrase } from '../lib/jd-analysis.mjs';

test('detects clinical modeling and analytics archetype', () => {
  const jd = 'Lead clinical modeling, simulation, RWD, patient enrollment prediction, protocol optimization, digital twins, Python and R for clinical development.';
  const result = analyzeJD(jd);
  assert.equal(result.archetypes[0].id, 'clinical-modeling-rwd-analytics');
  assert.ok(result.keywords.includes('clinical modeling'));
});

test('detects pharma R&D open innovation archetype', () => {
  const jd = 'Search and evaluation for external innovation, due diligence, AI platforms, biotech ecosystem, licensing, term sheets, R&D partnerships.';
  const result = analyzeJD(jd);
  assert.equal(result.archetypes[0].id, 'pharma-rd-open-innovation-bd');
});

test('extracts bounded normalized keywords', () => {
  const keywords = extractKeywords('Medical AI AI AI, RWD, real world evidence, clinical trial start-up, KOL engagement.', 5);
  assert.deepEqual(keywords, ['medical ai', 'real world evidence', 'clinical trial start-up', 'kol engagement', 'rwd']);
});

test('does not match short medical acronyms inside unrelated words', () => {
  const jd = 'Lead cross-functional adoption plans and coordinate product workstreams.';
  const result = analyzeJD(jd);

  assert.equal(matchesPhrase(jd, 'cro'), false);
  assert.equal(matchesPhrase('Own CRO vendor governance.', 'cro'), true);
  assert.equal(result.keywords.includes('cro'), false);
  assert.equal(result.archetypes.some((item) => item.id === 'pharma-clinical-development-operations'), false);
});

test('weights role-title signals above incidental secondary requirements', () => {
  const jd = `# Medical Digital Innovation and Product Strategy Lead

Lead China/APAC strategy for AI-enabled healthcare and medical digital solutions.
Identify opportunities for clinical analytics, RWD/RWE, workflow automation, and AI/ML use cases.`;
  const result = analyzeJD(jd);

  assert.equal(result.archetypes[0].id, 'medical-digital-product-marketing');
  assert.equal(result.keywords.includes('cro'), false);
});
