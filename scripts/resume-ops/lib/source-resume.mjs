import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

export async function loadSourceResume({ rootDir = process.cwd(), language = 'en' } = {}) {
  const fileName = language === 'zh' ? 'resume-zh.json' : 'resume-en.json';
  const resume = await readJson(join(rootDir, 'src', 'data', fileName));

  return {
    language,
    general: resume.general || {},
    summary: resume.summary || '',
    education: resume.education || [],
    work: resume.work || [],
    skills: resume.skills || [],
    projects: resume.projects || [],
    certificates: resume.certificates || [],
    publications: resume.publications || [],
    posters: resume.posters || [],
    patents: resume.patents || [],
  };
}
