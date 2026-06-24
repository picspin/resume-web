import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveCareerRows, getDefaultApplyDraft } from '../careerRows.js';

const version = {
  slug: 'medical-ai',
  label: 'Medical AI Lead',
  archetype: 'Medical AI / Clinical Workflow Solution',
  generatedAt: '2026-06-24T00:00:00.000Z',
  pdfPath: '/generated-resumes/cv-medical-ai.pdf',
  resume: { summary: 'Medical AI summary' },
  metadata: {
    keywords: ['medical ai'],
    truthWarnings: ['Do not overclaim.'],
    selectedProjects: ['PV.AI Workflow Initiative'],
  },
  evaluationMarkdown: '# Evaluation\n\n- **medical ai:** Adjacent evidence',
};

test('derives rows with default generated status', () => {
  const rows = deriveCareerRows({ versions: [version], applicationState: {} });
  assert.equal(rows[0].slug, 'medical-ai');
  assert.equal(rows[0].status, 'generated');
  assert.equal(rows[0].hasPdf, true);
  assert.equal(rows[0].nextAction, 'Review evidence');
});

test('uses saved state over defaults', () => {
  const rows = deriveCareerRows({
    versions: [version],
    applicationState: { 'medical-ai': { status: 'applied', applicationUrl: 'https://jobs.example/1' } },
  });
  assert.equal(rows[0].status, 'applied');
  assert.equal(rows[0].applicationUrl, 'https://jobs.example/1');
  assert.equal(rows[0].nextAction, 'Follow up');
});

test('builds deterministic manual apply draft', () => {
  const draft = getDefaultApplyDraft(version);
  assert.match(draft.hrMessage, /Medical AI Lead/);
  assert.match(draft.emailBody, /Medical AI summary/);
  assert.match(draft.linkedInMessage, /Medical AI Lead/);
});
