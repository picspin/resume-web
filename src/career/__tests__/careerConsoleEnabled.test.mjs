import test from 'node:test';
import assert from 'node:assert/strict';
import { isCareerConsoleEnabled, isCareerPath } from '../careerConsoleEnabled.js';

test('recognizes the local career route exactly', () => {
  assert.equal(isCareerPath('/career'), true);
  assert.equal(isCareerPath('/career/'), true);
  assert.equal(isCareerPath('/career?x=1'), true);
  assert.equal(isCareerPath('/'), false);
  assert.equal(isCareerPath('/career-public'), false);
});

test('requires an explicit Vite enable flag', () => {
  assert.equal(isCareerConsoleEnabled({ env: { VITE_ENABLE_CAREER_CONSOLE: 'true' }, pathname: '/career' }), true);
  assert.equal(isCareerConsoleEnabled({ env: { VITE_ENABLE_CAREER_CONSOLE: '1' }, pathname: '/career' }), true);
  assert.equal(isCareerConsoleEnabled({ env: { VITE_ENABLE_CAREER_CONSOLE: 'false' }, pathname: '/career' }), false);
  assert.equal(isCareerConsoleEnabled({ env: {}, pathname: '/career' }), false);
  assert.equal(isCareerConsoleEnabled({ env: { VITE_ENABLE_CAREER_CONSOLE: 'true' }, pathname: '/' }), false);
});
