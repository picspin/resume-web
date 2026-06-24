import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptResume } from '../lib/adapter.mjs';

const masterResume = {
  general: { name: 'Xiaolei Zhu, PhD', email_private: 'zxl1412@gmail.com' },
  summary: 'AI-enabled healthcare innovation leader with radiology, medical imaging, digital health, and product strategy experience.',
  work: [
    { title: 'Digital Solution Brand Management Manager', company: 'Bayer', date: '2023-2024', details: ['Led digital health portfolio strategy for AI-driven medical imaging solutions.'] },
    { title: 'Scientific Specialist', company: 'Siemens Healthineers', date: '2015-2017', details: ['Supported MRI scientific marketing and translational medicine projects.'] },
  ],
  skills: ['Medical imaging, radiology, AI/ML, RAG, Python, R, Matlab, SQL, product strategy.'],
  projects: [
    { title: 'AI-Powered Marketing Research', description: 'Used LLM, RAG, and LangChain for research insight generation.' },
    { title: 'PV.AI Workflow Initiative', description: 'Hospital-partner collaboration on Primovist AI applications.' },
  ],
  education: [],
  certificates: [],
  publications: [],
};

test('adapts resume using existing evidence only', () => {
  const result = adaptResume(masterResume, {
    roleLabel: 'Clinical Modeling & Analytics Innovation Lead',
    keywords: ['clinical modeling', 'rwd', 'medical imaging', 'ai/ml'],
    archetypes: [{ id: 'clinical-modeling-rwd-analytics', label: 'Clinical Modeling, RWD / RWE, and Trial Analytics', matchedSignals: ['clinical modeling'] }],
  });

  assert.equal(result.resume.general.name, 'Xiaolei Zhu, PhD');
  assert.match(result.resume.summary, /medical imaging/i);
  assert.equal(result.metadata.truthWarnings.some((warning) => warning.includes('clinical trial start-up ownership')), true);
  assert.equal(result.metadata.archetypes[0].id, 'clinical-modeling-rwd-analytics');
});
