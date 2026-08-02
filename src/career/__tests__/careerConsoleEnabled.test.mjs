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

test('opens the local Career Console for the exact route in Vite dev mode', () => {
  assert.equal(isCareerConsoleEnabled({ env: { DEV: true }, pathname: '/career' }), true);
  assert.equal(isCareerConsoleEnabled({ env: { DEV: true }, pathname: '/career/' }), true);
  assert.equal(isCareerConsoleEnabled({ env: { DEV: true }, pathname: '/' }), false);
  assert.equal(isCareerConsoleEnabled({ env: { DEV: true }, pathname: '/career-public' }), false);
});

test('requires Vite dev mode', () => {
  assert.equal(isCareerConsoleEnabled({ env: { DEV: false }, pathname: '/career' }), false);
  assert.equal(isCareerConsoleEnabled({ env: {}, pathname: '/career' }), false);
});
