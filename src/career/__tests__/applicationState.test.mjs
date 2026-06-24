import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAREER_STORAGE_KEY,
  readApplicationState,
  resolveApplicationStorage,
  updateApplicationRecord,
  writeApplicationState,
} from '../applicationState.js';

function memoryStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
    dump: () => Object.fromEntries(store),
  };
}

test('returns empty state when storage is unavailable or corrupt', () => {
  assert.deepEqual(readApplicationState(null), {});
  const storage = memoryStorage({ [CAREER_STORAGE_KEY]: '{bad json' });
  assert.deepEqual(readApplicationState(storage), {});
});

test('writes and reads application state', () => {
  const storage = memoryStorage();
  writeApplicationState(storage, { role: { status: 'reviewing' } });
  assert.deepEqual(readApplicationState(storage), { role: { status: 'reviewing' } });
});

test('ignores storage write failures', () => {
  const storage = {
    getItem: () => null,
    setItem: () => {
      throw new Error('quota exceeded');
    },
  };

  assert.doesNotThrow(() => writeApplicationState(storage, { role: { status: 'reviewing' } }));
});

test('falls back safely when localStorage access throws', () => {
  const originalWindow = globalThis.window;
  globalThis.window = {};

  Object.defineProperty(globalThis.window, 'localStorage', {
    configurable: true,
    get: () => {
      throw new Error('blocked');
    },
  });

  try {
    assert.equal(resolveApplicationStorage(), null);
  } finally {
    if (originalWindow === undefined) {
      Reflect.deleteProperty(globalThis, 'window');
    } else {
      globalThis.window = originalWindow;
    }
  }
});

test('updates one slug with default status and timestamp', () => {
  const next = updateApplicationRecord({}, 'medical-ai', { status: 'ready_to_apply', notes: 'Confirm summary' }, '2026-06-24T00:00:00.000Z');
  assert.equal(Object.hasOwn(next, 'medical-ai'), true);
  assert.equal(next['medical-ai'].status, 'ready_to_apply');
  assert.equal(next['medical-ai'].notes, 'Confirm summary');
  assert.equal(next['medical-ai'].updatedAt, '2026-06-24T00:00:00.000Z');
});
