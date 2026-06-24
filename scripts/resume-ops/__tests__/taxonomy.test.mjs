import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeJD, extractKeywords } from '../lib/jd-analysis.mjs';

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
