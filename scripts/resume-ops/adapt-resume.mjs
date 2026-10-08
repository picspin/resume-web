import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { analyzeJD } from './lib/jd-analysis.mjs';
import { loadSourceResume } from './lib/source-resume.mjs';
import { adaptResume } from './lib/adapter.mjs';
import { renderEvaluation } from './lib/evaluation.mjs';
import { resolveCareerVersionDir } from './lib/paths.mjs';
import { INVALID_SOURCE, snapshotSourceDocument } from './lib/workflow-source.mjs';

function parseArgs(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) {
      args.set(argv[i].slice(2), argv[i + 1]);
      i += 1;
    }
  }

  return {
    jdPath: args.get('jd'),
    hasSource: args.has('source'),
    sourcePath: args.get('source'),
    slug: args.get('slug') || 'sample-medical-digital-role',
  };
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function main(argv = process.argv.slice(2)) {
  const { jdPath, slug, hasSource, sourcePath } = parseArgs(argv);
  if (!jdPath) throw new Error('Missing --jd path');

  const jdText = await readFile(jdPath, 'utf8');
  let sourceDocument;
  if (hasSource) {
    try {
      sourceDocument = snapshotSourceDocument(JSON.parse(await readFile(sourcePath, 'utf8')));
    } catch { throw new Error(INVALID_SOURCE); }
  }
  const masterResume = hasSource ? sourceDocument.resume : await loadSourceResume({ rootDir: process.cwd(), language: 'en' });
  const jdAnalysis = analyzeJD(jdText);
  const { resume, metadata } = adaptResume(masterResume, jdAnalysis);
  if (hasSource) {
    // Only reorder supplied evidence; the legacy summary contains sample-specific claims.
    resume.summary = masterResume.summary || '';
    metadata.sourceDocumentId = sourceDocument.id;
    metadata.sourceRevision = sourceDocument.revision;
    metadata.localOnly = true;
    metadata.rewritePolicy = 'source-evidence-only-reorder';
    metadata.truthWarnings = ['Only supplied source evidence is retained; JD keywords are targeting labels, not candidate claims.'];
  }
  const outDir = resolveCareerVersionDir({ rootDir: process.cwd(), slug });

  await writeJson(join(outDir, 'resume.json'), resume);
  await writeJson(join(outDir, 'metadata.json'), metadata);
  await writeFile(join(outDir, 'evaluation.md'), renderEvaluation({ jdAnalysis, metadata, resume }), 'utf8');

  console.log(`Generated career/versions/${slug}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
