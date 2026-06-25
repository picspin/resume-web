import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useApplicationState } from '../useApplicationState.js';

test('can initialize the hook when window storage is unavailable', () => {
  const originalWindow = globalThis.window;
  Reflect.deleteProperty(globalThis, 'window');

  try {
    function Probe() {
      const { applicationState } = useApplicationState();
      assert.deepEqual(applicationState, {});
      return React.createElement('div', null, 'probe');
    }

    assert.doesNotThrow(() => {
      renderToStaticMarkup(React.createElement(Probe));
    });
  } finally {
    if (originalWindow === undefined) {
      Reflect.deleteProperty(globalThis, 'window');
    } else {
      globalThis.window = originalWindow;
    }
  }
});
