import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mdPath = path.join(__dirname, '../public/Xiaolei Zhu-PhD.md');
const enJsonPath = path.join(__dirname, '../src/data/resume-en.json');

function normalizeHeader(line) {
  // Remove leading hashes, emoji, HTML entities, and extra spaces, then uppercase
  return line
    .replace(/^#+/, '')
    .replace(/&[#A-Za-z0-9]+;/g, '') // remove HTML entities
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '') // remove emoji
    .replace(/[^\w ]/g, '') // remove non-word, non-space
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function extractSection(md, header) {
  // Use a line-based approach for robust section extraction
  const lines = md.split(/\r?\n/);
  const normHeader = header.trim().toUpperCase();
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const normLine = normalizeHeader(lines[i]);
    if (normLine === normHeader) {
      start = i + 1;
      break;
    }
  }
  if (start === -1) {
    console.warn(`[WARN] Section not found: ${header}`);
    return '';
  }
  // Find the next header or end of file
  let end = lines.length;
  for (let i = start; i < lines.length; i++) {
    if (/^#+/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join('\n').trim();
}

function extractTable(md, header) {
  // Extracts a markdown table under a header
  const section = extractSection(md, header);
  const tableMatch = section.match(/\|(.|\n)*?\| *[A-Za-z ]+ *\|(.|\n)*?\n((\|.*\n)+)/);
  if (!tableMatch) return [];
  const rows = tableMatch[3].trim().split('\n');
  return rows.map(row => {
    const cols = row.split('|').map(s => s.trim()).filter(Boolean);
    return cols;
  });
}

function parseGeneral(md) {
  const section = extractSection(md, 'GENERAL INFORMATION');
  const lines = section.split('\n').map(l => l.trim()).filter(Boolean);
  const general = {};
  for (const line of lines) {
    if (line.startsWith('- _Name:')) general.name = line.replace(/^- _Name:/, '').replace(/_/g, '').trim();
    if (line.startsWith('- _Address:')) general.address = line.replace(/^- _Address:/, '').replace(/_/g, '').trim();
    if (line.startsWith('- _Email:')) general.email_work = line.replace(/^- _Email:/, '').replace(/_/g, '').trim();
    if (line.startsWith('- _priv.:')) general.email_private = line.replace(/^- _priv.:/, '').replace(/_/g, '').trim();
    if (line.startsWith('- _Tel.#:')) general.tel = line.replace(/^- _Tel.#:/, '').replace(/_/g, '').trim();
  }
  // Ensure all fields exist as strings
  return {
    name: general.name || '',
    address: general.address || '',
    email_work: general.email_work || '',
    email_private: general.email_private || '',
    tel: general.tel || ''
  };
}

function parseEducation(md) {
  const rows = extractTable(md, 'EDUCATION BACKGROUND');
  return rows.map(cols => ({
    degree: cols[0],
    major: cols[1],
    institution: cols[2],
    date: cols[3],
    year: cols[4]
  }));
}

function parseCertificates(md) {
  const rows = extractTable(md, 'Certificate & Reputation');
  return rows.map(cols => ({
    title: cols[0],
    organization: cols[1],
    date: cols[2]
  }));
}

function parseSkills(md) {
  const section = extractSection(md, 'Professional Strengthens & Skills');
  // Split by > or newlines, filter empty, convert to HTML
  return section.split(/\n> ?/).map(s => s.trim()).filter(Boolean).map(s => marked.parse(s));
}

function parseWork(md) {
  // Find all job blocks by #### **Title**\n**Company** (date) | location\n- ...
  const workSection = extractSection(md, 'Work Experiences');
  const jobs = [];
  const jobBlocks = workSection.split(/\n#### /).slice(1);
  for (const block of jobBlocks) {
    const lines = block.split('\n').map(l => l.trim());
    const title = lines[0].replace(/\*\*/g, '').trim();
    const companyLine = lines[1] || '';
    const companyMatch = companyLine.match(/\*\*(.*?)\*\* \((.*?)\) \| (.*)/);
    let company = '', date = '', location = '';
    if (companyMatch) {
      company = companyMatch[1];
      date = companyMatch[2];
      location = companyMatch[3];
    } else {
      // fallback: try to parse company and location
      const parts = companyLine.replace(/\*\*/g, '').split('|').map(s => s.trim());
      company = parts[0] || '';
      location = parts[1] || '';
    }
    // Details: lines starting with -
    const details = lines.filter(l => l.startsWith('- ')).map(l => marked.parseInline(l.replace(/^- /, '')));
    jobs.push({ title, company, date, location, details });
  }
  return jobs;
}

function parseProjects(md) {
  // Find the numbered list under PROJECT EXPERIENCES AND ACHIEVEMENTS
  const section = extractSection(md, 'PROJECT EXPERIENCES AND ACHIEVEMENTS');
  const lines = section.split(/\n\d+\. /).slice(1);
  return lines.map(l => marked.parseInline(l.trim()));
}

function parsePublications(md) {
  // Find the numbered list under Publications, before Poster & Presentation
  const section = extractSection(md, 'Publications');
  const peerReviewed = section.split(/Poster & Presentation/)[0] || '';
  const pubs = peerReviewed.split(/\n\d+\. /).slice(1);
  return pubs.map(pub => {
    // Try to extract title, authors, journal, link
    const html = marked.parseInline(pub.trim());
    return { html };
  });
}

function parsePosters(md) {
  // Find the numbered list under Poster & Presentation
  const section = extractSection(md, 'Publications');
  const postersSection = section.split(/Poster & Presentation/)[1] || '';
  const posters = postersSection.split(/\n\d+\. /).slice(1);
  return posters.map(p => marked.parseInline(p.trim()));
}

function parsePatents(md) {
  // Find the numbered list under PATENT
  const section = extractSection(md, 'PATENT');
  const lines = section.split(/\n\d+\. /).slice(1);
  return lines.map(l => marked.parseInline(l.trim()));
}

async function sync() {
  const md = await fs.readFile(mdPath, 'utf-8');
  // Print the first 20 lines for debugging
  console.log('First 20 lines of markdown file:');
  console.log(md.split('\n').slice(0, 20).join('\n'));
  const en = {};
  en.general = parseGeneral(md);
  en.summary = marked.parse(extractSection(md, 'SUMMARY'));
  en.education = parseEducation(md);
  en.work = parseWork(md);
  en.skills = parseSkills(md);
  en.certificates = parseCertificates(md);
  en.projects = parseProjects(md);
  en.publications = parsePublications(md);
  en.posters = parsePosters(md);
  en.patents = parsePatents(md);
  // Debug output for each section
  console.log('Extracted general:', en.general);
  console.log('Extracted summary:', en.summary);
  console.log('Extracted education:', en.education);
  console.log('Extracted work:', en.work);
  console.log('Extracted skills:', en.skills);
  console.log('Extracted certificates:', en.certificates);
  console.log('Extracted projects:', en.projects);
  console.log('Extracted publications:', en.publications);
  console.log('Extracted posters:', en.posters);
  console.log('Extracted patents:', en.patents);
  await fs.writeFile(enJsonPath, JSON.stringify(en, null, 2));
  console.log('resume-en.json updated from markdown.');
}

await sync(); 