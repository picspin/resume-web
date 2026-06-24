import test from 'node:test';
import assert from 'node:assert/strict';
import { buildManifestEntry, buildManifests } from '../lib/manifest.mjs';

const resume = {
  general: { name: 'Xiaolei Zhu, PhD' },
  summary: 'Tailored summary',
  targetedKeywords: ['medical ai'],
};

const metadata = {
  roleLabel: 'Medical AI Lead',
  generatedAt: '2026-06-24T00:00:00.000Z',
  archetypes: [{ id: 'medical-ai-clinical-workflow', label: 'Medical AI / Clinical Workflow Solution' }],
  keywords: ['medical ai'],
  truthWarnings: ['Do not claim unsupported ownership.'],
  pdf: { publicPath: '/generated-resumes/cv-medical-ai.pdf' },
};

test('public manifest omits private review metadata', () => {
  const { publicEntry } = buildManifestEntry({ slug: 'medical-ai', metadata, resume, evaluationMarkdown: '# Review' });
  assert.equal(publicEntry.slug, 'medical-ai');
  assert.equal(publicEntry.label, 'Medical AI Lead');
  assert.equal(publicEntry.pdfPath, '/generated-resumes/cv-medical-ai.pdf');
  assert.equal(Object.hasOwn(publicEntry, 'metadata'), false);
  assert.equal(Object.hasOwn(publicEntry, 'evaluationMarkdown'), false);
});

test('local career manifest includes review metadata and evaluation text', () => {
  const { careerEntry } = buildManifestEntry({ slug: 'medical-ai', metadata, resume, evaluationMarkdown: '# Review' });
  assert.deepEqual(careerEntry.metadata.truthWarnings, ['Do not claim unsupported ownership.']);
  assert.equal(careerEntry.evaluationMarkdown, '# Review');
});

test('manifests sort newest first', () => {
  const older = { slug: 'older', metadata: { ...metadata, generatedAt: '2026-01-01T00:00:00.000Z', roleLabel: 'Older' }, resume, evaluationMarkdown: '' };
  const newer = { slug: 'newer', metadata: { ...metadata, generatedAt: '2026-06-24T00:00:00.000Z', roleLabel: 'Newer' }, resume, evaluationMarkdown: '' };
  const { publicVersions } = buildManifests([older, newer]);
  assert.deepEqual(publicVersions.map((item) => item.slug), ['newer', 'older']);
});
