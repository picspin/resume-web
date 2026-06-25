import { resolve, join, relative } from 'node:path';

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export function validateSlug(slug) {
  if (!SLUG_PATTERN.test(String(slug || ''))) {
    throw new Error(`Invalid slug "${slug}". Expected lowercase kebab-case matching ${SLUG_PATTERN.source}.`);
  }

  return slug;
}

export function assertPathWithinRoot({ rootDir, targetPath }) {
  const resolvedRoot = resolve(rootDir);
  const resolvedTarget = resolve(targetPath);
  const relativePath = relative(resolvedRoot, resolvedTarget);

  if (relativePath === '' || (!relativePath.startsWith('..') && !relativePath.includes(`..${process.platform === 'win32' ? '\\' : '/'}`))) {
    return resolvedTarget;
  }

  throw new Error(`Resolved path "${resolvedTarget}" is outside the allowed directory "${resolvedRoot}".`);
}

export function resolveCareerVersionDir({ rootDir, slug }) {
  const safeSlug = validateSlug(slug);
  const versionsRoot = join(rootDir, 'career', 'versions');
  const versionDir = join(versionsRoot, safeSlug);

  return assertPathWithinRoot({ rootDir: versionsRoot, targetPath: versionDir });
}

export function resolveCareerOutputPath({ rootDir, slug, fileName }) {
  const outputRoot = join(rootDir, 'career', 'output');
  const filePath = join(outputRoot, fileName.replace('{slug}', validateSlug(slug)));

  return assertPathWithinRoot({ rootDir: outputRoot, targetPath: filePath });
}

export function resolvePublicGeneratedPath({ rootDir, slug, fileName }) {
  const publicRoot = join(rootDir, 'public', 'generated-resumes');
  const filePath = join(publicRoot, fileName.replace('{slug}', validateSlug(slug)));

  return assertPathWithinRoot({ rootDir: publicRoot, targetPath: filePath });
}
