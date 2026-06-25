import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { loadSourceResume } from './lib/source-resume.mjs';

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

const rootDir = process.cwd();

await writeJson(join(rootDir, 'career', 'data', 'master-resume.json'), await loadSourceResume({ rootDir, language: 'en' }));
await writeJson(join(rootDir, 'career', 'data', 'master-resume.zh.json'), await loadSourceResume({ rootDir, language: 'zh' }));
console.log('Synced career/data/master-resume.json and master-resume.zh.json');
