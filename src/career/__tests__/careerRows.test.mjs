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

test('non-medical job drafts use only its captured result, including its signature', () => {
  const result = { slug: 'railway', label: 'Railway Controls Engineer', sourceDocumentId: 'rail-source', resume: { general: { name: 'Morgan Test' }, summary: 'Designed railway signalling systems.' } };
  const [row] = deriveCareerRows({ versions: [result], applicationState: { railway: { resume: { general: { name: 'Other Person' }, summary: 'Other background' }, label: 'Other job', notes: 'Keep my note' } } });
  const draft = getDefaultApplyDraft(row);
  for (const text of Object.values(draft)) {
    assert.match(text, /Railway Controls Engineer/);
    assert.match(text, /Designed railway signalling systems/);
    assert.doesNotMatch(text, /Xiaolei|medical|healthcare|China|APAC|Other Person|Other background|Other job/i);
  }
  assert.match(draft.emailBody, /Best regards,\nMorgan Test$/);
  assert.equal(row.notes, 'Keep my note');
});

test('captured source is used only when result absent; empty result never backfills sample claims', () => {
  const sourceDocument = { resume: { general: { name: 'Source Engineer' }, summary: 'Railway evidence' } };
  assert.match(getDefaultApplyDraft({ sourceDocument }).emailBody, /Source Engineer/);
  const draft = getDefaultApplyDraft({ sourceDocument, sourceDocumentId: 'source', resume: { general: {}, summary: '' } });
  assert.doesNotMatch(JSON.stringify(draft), /Source Engineer|Railway evidence|Xiaolei|medical|healthcare/i);
  assert.doesNotMatch(JSON.stringify(getDefaultApplyDraft({ sourceDocumentId: 'missing' })), /Xiaolei|medical|healthcare/i);
});
