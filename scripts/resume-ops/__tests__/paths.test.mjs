import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import {
  assertPathWithinRoot,
  resolveCareerVersionDir,
  validateSlug,
} from '../lib/paths.mjs';

test('validateSlug accepts lowercase kebab-case slugs', () => {
  assert.equal(validateSlug('medical-ai-2026'), 'medical-ai-2026');
});

test('validateSlug rejects path traversal, whitespace, and shell metacharacters', () => {
  for (const slug of ['nested/slug', '..', 'two words', 'role;rm-rf']) {
    assert.throws(() => validateSlug(slug), /Invalid slug/);
  }
});

test('resolveCareerVersionDir keeps output under career/versions', () => {
  const rootDir = '/workspace/resume-web';
  const versionDir = resolveCareerVersionDir({ rootDir, slug: 'medical-ai' });

  assert.equal(versionDir, join(rootDir, 'career', 'versions', 'medical-ai'));
});

test('assertPathWithinRoot rejects resolved paths outside the intended directory', () => {
  assert.throws(
    () => assertPathWithinRoot({ rootDir: '/workspace/resume-web/career/versions', targetPath: '/workspace/resume-web/career/output/medical-ai' }),
    /outside the allowed directory/,
  );
});
