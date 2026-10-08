import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPrintHtml } from '../lib/render-print-html.mjs';

const template = '<html lang="{{LANG}}"><body><h1>{{NAME}}</h1><div>{{ROLE_LABEL}}</div><main>{{BODY}}</main></body></html>';

const resume = {
  language: 'en',
  general: { name: 'Xiaolei Zhu, PhD', email_private: 'xiaolei@example.com' },
  summary: 'Healthcare AI and medical digital strategy leader.',
  targetedKeywords: ['medical digital', 'product strategy'],
  work: [],
  projects: [],
  education: [],
};

const metadata = {
  roleLabel: 'Medical Digital Innovation Lead',
  truthWarnings: ['Internal note that should stay out of external PDFs.'],
};

test('hides internal truth notes from external print HTML by default', () => {
  const html = renderPrintHtml({ resume, metadata, template });

  assert.doesNotMatch(html, /Truth Notes/);
  assert.doesNotMatch(html, /Internal note/);
});

test('can render truth notes for explicit review mode', () => {
  const html = renderPrintHtml({ resume, metadata, template, includeTruthNotes: true });

  assert.match(html, /Truth Notes/);
  assert.match(html, /Internal note/);
});

test('blank source-backed print identity never falls back to the sample', () => {
  for (const general of [{ name: '' }, {}, undefined]) {
    for (const sourceMetadata of [{ sourceDocumentId: 'synthetic-source' }, { localOnly: true }]) {
      const html = renderPrintHtml({ resume: { general, summary: 'Railway controls.' }, metadata: sourceMetadata, template });
      assert.match(html, /<h1><\/h1>/);
      assert.doesNotMatch(html, /Xiaolei|Medical Digital Role/);
    }
  }
});

test('legacy print retains its sample fallback without source metadata', () => {
  const html = renderPrintHtml({ resume: {}, metadata: {}, template });
  assert.match(html, /<h1>Xiaolei Zhu, PhD<\/h1>/);
});
