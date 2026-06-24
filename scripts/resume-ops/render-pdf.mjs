import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';
import { renderPrintHtml } from './lib/render-print-html.mjs';

function parseArgs(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) {
      args.set(argv[i].slice(2), argv[i + 1]);
      i += 1;
    }
  }
  return { slug: args.get('slug') || 'sample-medical-digital-role' };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function ensureDir(path) {
  await mkdir(dirname(path), { recursive: true });
}

const { slug } = parseArgs(process.argv.slice(2));
const root = process.cwd();
const versionDir = join(root, 'career', 'versions', slug);
const resume = await readJson(join(versionDir, 'resume.json'));
const metadata = await readJson(join(versionDir, 'metadata.json'));
const template = await readFile(join(root, 'career', 'templates', 'resume-print.html'), 'utf8');
const html = renderPrintHtml({ resume, metadata, template });
const htmlPath = join(versionDir, 'print.html');
await writeFile(htmlPath, html, 'utf8');

const date = new Date().toISOString().slice(0, 10);
const pdfName = `cv-${slug}-${date}.pdf`;
const careerPdf = join(root, 'career', 'output', pdfName);
const publicPdf = join(root, 'public', 'generated-resumes', pdfName);
await ensureDir(careerPdf);
await ensureDir(publicPdf);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'networkidle' });
await page.pdf({ path: careerPdf, format: 'A4', printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
await browser.close();
await copyFile(careerPdf, publicPdf);

metadata.pdf = {
  careerPath: `career/output/${pdfName}`,
  publicPath: `/generated-resumes/${pdfName}`,
  generatedAt: new Date().toISOString(),
};
await writeFile(join(versionDir, 'metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
console.log(metadata.pdf.publicPath);
