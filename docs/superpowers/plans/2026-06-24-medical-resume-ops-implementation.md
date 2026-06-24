# Medical Resume-Ops Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a medical-industry resume-ops vertical slice that creates JD-specific resume versions, evaluates them with healthcare/pharma archetypes, renders PDF output, and previews versions in the existing React resume site.

**Architecture:** Add a self-contained `career/` workspace and focused Node scripts under `scripts/resume-ops/`. Scripts generate static JSON, HTML, PDFs, and a version manifest consumed by React. The first slice includes scanner prompt/config customization, but not a live multi-source scanner UI.

**Tech Stack:** React 18, Vite 6, Tailwind CSS, Node ESM, `node:test`, `fs/promises`, `js-yaml`, Playwright Chromium for PDF rendering.

## Global Constraints

- Do not directly mutate `/Users/hilbert/LLM/career-ops`; adapt relevant ideas into `resume-web/career/`.
- Keep existing `src/data/resume-en.json` and `src/data/resume-zh.json` compatible with the current Web resume.
- JD tailoring may reframe real evidence, but must not invent qualifications, metrics, regulatory experience, direct oncology/radiation therapy ownership, clinical-trial start-up ownership, CTA/NDA ownership, signed-deal ownership, or line-management scope unless source data supports it.
- Phase 1 content initializes in English first, with data structure room for Chinese labels and future Chinese-tailored versions.
- Customized prompts live under `career/modes/`; do not add a top-level `modes/` directory in Phase 1.
- First scanner configuration targets China/APAC medical devices, pharma digital, healthcare IT, medical AI, radiology, oncology, pharma R&D, clinical development, medical affairs, and open-innovation roles.
- The PDF must be single-column, ATS-readable, selectable text, A4 by default, and visually checked after generation.
- The Web app must still build with `npm run build`.

---

## File Structure

- Create `career/config/profile.yml`: medical/pharma profile initialized from latest resume evidence.
- Create `career/data/.gitkeep`, `career/jds/sample-medical-digital-role.md`, `career/modes/*.md`, `career/templates/*.html|yml`, `career/output/.gitkeep`, `career/versions/.gitkeep`: local medical career workspace.
- Create `scripts/resume-ops/lib/taxonomy.mjs`: medical archetype rules, scanner keywords, and role KPI domains.
- Create `scripts/resume-ops/lib/source-resume.mjs`: normalizes existing resume JSON into the master resume contract.
- Create `scripts/resume-ops/lib/jd-analysis.mjs`: extracts JD text signals, keywords, and archetype matches.
- Create `scripts/resume-ops/lib/evaluation.mjs`: generates A-G evaluation Markdown and metadata.
- Create `scripts/resume-ops/lib/adapter.mjs`: creates tailored resume JSON without inventing evidence.
- Create `scripts/resume-ops/lib/render-print-html.mjs`: fills the print HTML template.
- Create `scripts/resume-ops/sync-master.mjs`, `adapt-resume.mjs`, `render-pdf.mjs`, `build-version.mjs`: CLI entry points.
- Create `scripts/resume-ops/__tests__/*.test.mjs`: Node test coverage for taxonomy, JD analysis, and adapter truth constraints.
- Modify `package.json`: add `resume:*` scripts and dependencies.
- Modify `src/App.jsx` and `src/components/Header.jsx`: load generated version manifest and route download to selected version.
- Modify `src/components/ResumeSection.jsx` only if the generated data contract needs defensive rendering for missing optional arrays.

---

### Task 1: Workspace Content And Profile Foundation

**Files:**
- Create: `career/config/profile.yml`
- Create: `career/data/.gitkeep`
- Create: `career/jds/sample-medical-digital-role.md`
- Create: `career/modes/_shared.md`
- Create: `career/modes/evaluate.md`
- Create: `career/modes/pdf.md`
- Create: `career/modes/scan.md`
- Create: `career/templates/portals.example.yml`
- Create: `career/templates/resume-print.html`
- Create: `career/output/.gitkeep`
- Create: `career/versions/.gitkeep`

**Interfaces:**
- Produces: static files consumed by Tasks 2-6.
- Consumes: evidence from `src/data/resume-en.json`, `src/data/resume-zh.json`, `public/Xiaolei Zhu-PhD.md`, and the design spec.

- [ ] **Step 1: Create the workspace tree**

Run:

```bash
mkdir -p career/config career/data career/jds career/modes career/templates career/output career/versions
touch career/data/.gitkeep career/output/.gitkeep career/versions/.gitkeep
```

Expected: directories exist and `git status --short career` shows new files only under `career/`.

- [ ] **Step 2: Write `career/config/profile.yml`**

Create this file:

```yaml
candidate:
  full_name: "Xiaolei Zhu, PhD"
  location: "Guangzhou, Guangdong, China"
  email_work: "xiaolei.zhu@bayer.com"
  email_private: "zxl1412@gmail.com"
  phone_cn: "+86 18607106505"
  phone_de: "+49 15203046915"
  portfolio_url: "https://picspin.github.io"
  github: "https://github.com/picspin"
  linkedin: "https://www.linkedin.com/in/xiaolei-hilbert-space/"

positioning:
  headline: "AI-enabled healthcare innovation and digital radiology leader"
  summary_scope:
    - "Medical imaging and radiology"
    - "Healthcare digitalization and medical AI"
    - "China/APAC/global localization"
    - "Product strategy, clinical applications, and scientific solution building"
  non_negotiable_truth_rules:
    - "Do not invent direct radiation therapy product ownership."
    - "Do not invent NMPA registration leadership."
    - "Do not invent clinical trial start-up ownership, CTA/NDA ownership, signed-deal ownership, or line-management scope."
    - "Use adjacent positioning when the resume supports related but not identical experience."

target_roles:
  primary:
    - "Digital Health Product Marketing / Product Manager"
    - "Medical AI Solution / Clinical Workflow Lead"
    - "Healthcare Digital Transformation / Innovation Lead"
    - "Medical Device Product Strategy / Portfolio Manager"
    - "Medical BD / Strategic Partnership / Ecosystem Development"
  adjacent:
    - "Pharma Clinical Development / Clinical Operations Innovation"
    - "Clinical Modeling, RWD / RWE, and Trial Analytics Lead"
    - "Medical Affairs AI / Integrated Healthcare Solution Lead"
    - "Pharma R&D Open Innovation / External Innovation BD"
    - "Medical AI Evaluation / Standards / Scientific Committee Lead"
    - "Medical Device / Imaging Solution R&D Innovation Lead"

signature_advantages:
  - "PhD-level MR imaging and molecular imaging foundation"
  - "Siemens and Bayer medical imaging domain experience"
  - "Global/APAC/China localization bridge"
  - "LLM/RAG, Google Cloud, AI/ML, MONAI, Python, R, Matlab, and SQL exposure"
  - "Hospital, academic, vendor, KOL, and internal stakeholder ecosystem experience"
  - "Product marketing, portfolio strategy, business case, and sales enablement"

output:
  default_language: "en"
  default_paper_format: "a4"
  public_pdf_base_path: "/generated-resumes"
```

- [ ] **Step 3: Write `career/jds/sample-medical-digital-role.md`**

Use a synthetic MNC JD that combines product marketing, medical AI, clinical workflow, and pharma innovation signals. It must not name a specific employer:

```markdown
# Sample JD: Medical Digital Innovation and Product Strategy Lead

## Role

Lead China/APAC strategy for AI-enabled healthcare and medical digital solutions. Translate global product and R&D priorities into local clinical, commercial, and stakeholder adoption plans.

## Responsibilities

- Build disease-area and workflow-based AI/digital solution strategies with medical affairs, commercial, access, R&D, and external partners.
- Evaluate clinical needs, market opportunities, competitive landscape, and business cases for medical AI and healthcare digital products.
- Partner with hospitals, KOLs, academic groups, and technology vendors to pilot solutions and demonstrate clinical and business value.
- Support evidence-generation plans, medical education, sales enablement, and internal/external communication.
- Identify opportunities for clinical analytics, RWD/RWE, workflow automation, and AI/ML use cases in clinical development or care delivery.

## Qualifications

- Advanced degree in life sciences, medicine, biomedical engineering, imaging, data science, or related field.
- Experience in medical devices, pharma, digital health, medical affairs, clinical applications, product marketing, or business development.
- Understanding of healthcare AI, clinical workflow, medical imaging, evidence generation, and China/APAC healthcare stakeholders.
- Strong cross-functional leadership, stakeholder influence, and English/Chinese communication.
```

- [ ] **Step 4: Write prompt files**

Create `career/modes/_shared.md`:

```markdown
# Medical Resume-Ops Shared Context

## Sources Of Truth

- `src/data/resume-en.json`
- `src/data/resume-zh.json`
- `public/Xiaolei Zhu-PhD.md`
- `career/config/profile.yml`
- `career/data/master-resume.json`

## Truth Rules

- Reframe and reorder existing evidence only.
- Label adjacent evidence as adjacent.
- Do not invent direct radiation therapy product ownership.
- Do not invent NMPA registration leadership.
- Do not invent clinical trial start-up ownership, CTA/NDA ownership, signed-deal ownership, or line-management scope.
- Do not invent signed deals, P&L ownership, revenue numbers, customer counts, KOL counts, or market share unless source data supports them.

## Archetypes

| Archetype | Signals |
|-----------|---------|
| Medical Digital Product Marketing | product marketing, value proposition, pricing, launch, sales collateral, portfolio, market analysis |
| Medical AI / Clinical Workflow Solution | AI contouring, imaging AI, workflow software, RAG, ML/DL, hospital workflow, clinical adoption |
| Healthcare Digital Transformation | digital transformation, change management, adoption, enablement, cloud/data platform |
| Medical Device Portfolio / Product Strategy | lifecycle, roadmap, NPI, localization, competitive landscape, business case, regulatory registration |
| Clinical Application / Scientific Solution Lead | clinical education, application support, KOL, scientific communication, hospital collaboration |
| Medical BD / Ecosystem Partnership | partnership, alliance, ecosystem, vendor management, business development |
| Radiology / Oncology Commercialization | radiology, oncology, radiation therapy, digital oncology, treatment planning, imaging management |
| Pharma Clinical Development / Operations Innovation | clinical trial start-up, site activation, CTA/NDA, ICH-GCP, CTMS, CRO, patient journey |
| Clinical Modeling, RWD / RWE, and Trial Analytics | clinical modeling, simulation, RWD, RWE, patient recruitment prediction, protocol optimization, digital twins |
| Medical Affairs AI / Integrated Healthcare Solutions | medical affairs, disease-area strategy, access, AI/digital solution implementation, patient outcomes |
| Pharma R&D Open Innovation / External Innovation BD | open innovation, external innovation, search and evaluation, due diligence, licensing, biotech ecosystem |
| Medical AI Evaluation / Standards / Committee Leadership | AI model evaluation, expert committee, standards, academic conferences, model benchmarking |
| Medical Device / Imaging Solution R&D Innovation | device R&D, imaging platform, clinical requirements, algorithm-product integration, verification |
```

Create `career/modes/evaluate.md`:

```markdown
# Mode: Evaluate Medical JD

Always produce Blocks A-G.

## Block A - Role And Market Context

Classify the JD into one primary medical archetype and one optional secondary archetype. Identify product or solution domain, stakeholder map, seniority, local/global bridge requirements, and implied first 6-12 month outcomes.

## Block B - Resume Evidence Match

Map JD requirements to exact source evidence from the master resume. Mark each item as direct match, adjacent match, evidence gap, HR-screening risk, or recommended wording.

## Block C - HR Screen And Level Strategy

Explain how HR and hiring managers will read the profile in 30 seconds. Recommend keywords for the first page and positioning for radiology, pharma R&D, clinical development, medical affairs, oncology, digital health, and healthcare IT roles.

## Block D - Business Impact, KPI, And Industry Insight

Infer role-specific KPIs. Use product marketing, clinical development, clinical analytics, open innovation, medical affairs, and device R&D KPI domains as relevant.

## Block E - Resume, Web, PDF, And LinkedIn Customization Plan

Recommend changes for summary, competencies, work bullets, projects, publications, LinkedIn headline/about, and portfolio links.

## Block F - Interview And Narrative Plan

Prepare STAR+R storylines, gap-handling answers, first 90 days plan, and a why-this-role narrative.

## Block G - Posting Legitimacy

Assess posting freshness, description specificity, company hiring signals, reposting risk, and medical-role context. Treat long senior/niche medical hiring cycles as normal unless multiple signals are concerning.
```

Create `career/modes/pdf.md`:

```markdown
# Mode: Medical Resume PDF

Generate a one-column ATS-readable PDF from a tailored resume version.

Rules:

- A4 by default.
- Selectable text only.
- No critical information in images.
- Header, professional summary, core competencies, work experience, selected projects, education, certifications, and selected publications.
- Include truth notes in metadata, not as visible warnings in final external versions unless the user requests review mode.
- Use medical/pharma keywords only when supported by source evidence.
```

Create `career/modes/scan.md`:

```markdown
# Mode: Medical Job Discovery

Target China/APAC medical devices, pharma digital, healthcare IT, medical AI, radiology, oncology, pharma R&D, clinical development, medical affairs, and open-innovation roles.

Positive title keywords include Digital Health, Healthcare IT, Medical AI, Clinical AI, Imaging AI, Radiology, Oncology, Product Marketing, Portfolio Manager, External Innovation, Search & Evaluation, Open Innovation, R&D Innovation, Clinical Development, Clinical Operations, Study Start-Up, Clinical Modeling, RWD, RWE, Medical Affairs, Evidence Generation, Medical Device R&D, Translational Research, and Healthcare Digital Transformation.

Reject titles that are junior, intern, nurse, physician-only, CRA/CRC-only, firmware-only, manufacturing-only, insurance claims, lab technician-only, or bench scientist-only without translational, AI, clinical, or strategic scope.
```

Create `career/templates/portals.example.yml`:

```yaml
title_filter:
  positive:
    - "Digital Health"
    - "Healthcare IT"
    - "Medical AI"
    - "Clinical AI"
    - "Imaging AI"
    - "Radiology"
    - "Oncology"
    - "Product Marketing"
    - "Product Manager"
    - "Portfolio Manager"
    - "External Innovation"
    - "Search & Evaluation"
    - "Open Innovation"
    - "R&D Innovation"
    - "Clinical Development"
    - "Clinical Operations"
    - "Study Start-Up"
    - "Clinical Modeling"
    - "Real World Evidence"
    - "Medical Affairs"
    - "Evidence Generation"
    - "Medical Device R&D"
  negative:
    - "Intern"
    - "Junior"
    - "Nurse"
    - "Physician"
    - "CRA"
    - "CRC"
    - "Firmware"
    - "Manufacturing"
    - "Insurance Claims"

company_categories:
  medical_imaging:
    - "Siemens Healthineers"
    - "GE HealthCare"
    - "Philips"
    - "Canon Medical"
    - "United Imaging"
  radiation_oncology:
    - "Varian"
    - "Elekta"
    - "RaySearch"
    - "Accuray"
  pharma_digital_rd:
    - "Bayer"
    - "Roche"
    - "AstraZeneca"
    - "Novartis"
    - "Sanofi"
    - "Pfizer"
    - "Johnson & Johnson"
    - "Eli Lilly"
    - "AbbVie"
    - "Astellas"
  clinical_research_rwd:
    - "IQVIA"
    - "ICON"
    - "Parexel"
    - "Medidata"
    - "Veeva"
```

Create `career/templates/resume-print.html` with template variables:

```html
<!doctype html>
<html lang="{{LANG}}">
<head>
  <meta charset="utf-8">
  <title>{{NAME}} - {{ROLE_LABEL}}</title>
  <style>
    * { box-sizing: border-box; }
    html { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #172033; background: #fff; font-size: 11px; line-height: 1.48; }
    .page { width: 210mm; margin: 0 auto; padding: 12mm 14mm; }
    h1 { margin: 0 0 4px; font-size: 25px; letter-spacing: 0; }
    .rule { height: 2px; background: linear-gradient(90deg, #0f766e, #5b21b6); margin: 8px 0 10px; }
    .contact { display: flex; flex-wrap: wrap; gap: 5px 12px; color: #475569; font-size: 10px; }
    h2 { margin: 14px 0 7px; padding-bottom: 3px; border-bottom: 1px solid #cbd5e1; color: #0f766e; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
    .tags { display: flex; flex-wrap: wrap; gap: 5px; }
    .tag { border: 1px solid #99f6e4; background: #f0fdfa; color: #115e59; padding: 3px 7px; border-radius: 3px; }
    .item { margin-bottom: 10px; }
    .item-head { display: flex; justify-content: space-between; gap: 12px; font-weight: 700; }
    .muted { color: #64748b; }
    ul { margin: 4px 0 0 18px; padding: 0; }
    li { margin: 0 0 3px; }
  </style>
</head>
<body>
  <main class="page">
    <header>
      <h1>{{NAME}}</h1>
      <div class="rule"></div>
      <div class="contact">{{CONTACT}}</div>
    </header>
    {{BODY}}
  </main>
</body>
</html>
```

- [ ] **Step 5: Commit**

```bash
git add career
git commit -m "feat: add medical resume-ops workspace"
```

---

### Task 2: Taxonomy And JD Analysis Library

**Files:**
- Create: `scripts/resume-ops/lib/taxonomy.mjs`
- Create: `scripts/resume-ops/lib/jd-analysis.mjs`
- Create: `scripts/resume-ops/__tests__/taxonomy.test.mjs`

**Interfaces:**
- Produces: `detectArchetypes(jdText): ArchetypeMatch[]`
- Produces: `extractKeywords(jdText, limit): string[]`
- Produces: `analyzeJD(jdText): { archetypes, keywords, domainSignals, roleLabel }`

- [ ] **Step 1: Write the failing taxonomy tests**

Create `scripts/resume-ops/__tests__/taxonomy.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeJD, extractKeywords } from '../lib/jd-analysis.mjs';

test('detects clinical modeling and analytics archetype', () => {
  const jd = 'Lead clinical modeling, simulation, RWD, patient enrollment prediction, protocol optimization, digital twins, Python and R for clinical development.';
  const result = analyzeJD(jd);
  assert.equal(result.archetypes[0].id, 'clinical-modeling-rwd-analytics');
  assert.ok(result.keywords.includes('clinical modeling'));
});

test('detects pharma R&D open innovation archetype', () => {
  const jd = 'Search and evaluation for external innovation, due diligence, AI platforms, biotech ecosystem, licensing, term sheets, R&D partnerships.';
  const result = analyzeJD(jd);
  assert.equal(result.archetypes[0].id, 'pharma-rd-open-innovation-bd');
});

test('extracts bounded normalized keywords', () => {
  const keywords = extractKeywords('Medical AI AI AI, RWD, real world evidence, clinical trial start-up, KOL engagement.', 5);
  assert.deepEqual(keywords, ['medical ai', 'real world evidence', 'clinical trial start-up', 'kol engagement', 'rwd']);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
node --test scripts/resume-ops/__tests__/taxonomy.test.mjs
```

Expected: FAIL with module not found for `../lib/jd-analysis.mjs`.

- [ ] **Step 3: Implement `taxonomy.mjs`**

Create `scripts/resume-ops/lib/taxonomy.mjs`:

```js
export const MEDICAL_ARCHETYPES = [
  {
    id: 'medical-digital-product-marketing',
    label: 'Medical Digital Product Marketing',
    signals: ['product marketing', 'value proposition', 'pricing', 'launch', 'sales collateral', 'portfolio', 'market analysis'],
  },
  {
    id: 'medical-ai-clinical-workflow',
    label: 'Medical AI / Clinical Workflow Solution',
    signals: ['ai contouring', 'imaging ai', 'workflow software', 'rag', 'machine learning', 'deep learning', 'hospital workflow', 'clinical adoption'],
  },
  {
    id: 'healthcare-digital-transformation',
    label: 'Healthcare Digital Transformation',
    signals: ['digital transformation', 'change management', 'adoption', 'enablement', 'cloud', 'data platform', 'operating model'],
  },
  {
    id: 'medical-device-portfolio-strategy',
    label: 'Medical Device Portfolio / Product Strategy',
    signals: ['lifecycle', 'roadmap', 'npi', 'localization', 'competitive landscape', 'business case', 'regulatory registration'],
  },
  {
    id: 'clinical-application-scientific-solution',
    label: 'Clinical Application / Scientific Solution Lead',
    signals: ['clinical education', 'application support', 'kol', 'scientific communication', 'hospital collaboration'],
  },
  {
    id: 'medical-bd-ecosystem-partnership',
    label: 'Medical BD / Ecosystem Partnership',
    signals: ['partnership', 'alliance', 'ecosystem', 'vendor management', 'business development', 'strategic partnership'],
  },
  {
    id: 'radiology-oncology-commercialization',
    label: 'Radiology / Oncology Commercialization',
    signals: ['radiology', 'oncology', 'radiation therapy', 'digital oncology', 'treatment planning', 'imaging management', 'ai contouring'],
  },
  {
    id: 'pharma-clinical-development-operations',
    label: 'Pharma Clinical Development / Operations Innovation',
    signals: ['clinical trial start-up', 'site activation', 'cta', 'nda', 'ich-gcp', 'ctms', 'cro', 'study execution', 'patient journey'],
  },
  {
    id: 'clinical-modeling-rwd-analytics',
    label: 'Clinical Modeling, RWD / RWE, and Trial Analytics',
    signals: ['clinical modeling', 'simulation', 'rwd', 'real world data', 'rwe', 'real world evidence', 'patient enrollment', 'protocol optimization', 'digital twins'],
  },
  {
    id: 'medical-affairs-ai-integrated-solutions',
    label: 'Medical Affairs AI / Integrated Healthcare Solutions',
    signals: ['medical affairs', 'disease-area strategy', 'access', 'integrated healthcare solution', 'patient outcomes', 'compliance', 'ecosystem leadership'],
  },
  {
    id: 'pharma-rd-open-innovation-bd',
    label: 'Pharma R&D Open Innovation / External Innovation BD',
    signals: ['open innovation', 'external innovation', 'search and evaluation', 'due diligence', 'licensing', 'biotech ecosystem', 'term sheets', 'r&d partnerships'],
  },
  {
    id: 'medical-ai-evaluation-standards',
    label: 'Medical AI Evaluation / Standards / Committee Leadership',
    signals: ['ai model evaluation', 'expert committee', 'standards', 'academic conferences', 'model benchmarking', 'industry influence'],
  },
  {
    id: 'medical-device-imaging-rd-innovation',
    label: 'Medical Device / Imaging Solution R&D Innovation',
    signals: ['device r&d', 'imaging platform', 'clinical requirements', 'algorithm-product integration', 'usability', 'verification', 'translational research'],
  },
];

export const SCANNER_POSITIVE_KEYWORDS = [
  'Digital Health', 'Healthcare IT', 'Medical AI', 'Clinical AI', 'Imaging AI', 'Radiology', 'Oncology',
  'Digital Oncology', 'Product Marketing', 'Product Manager', 'Portfolio Manager', 'Strategic Marketing',
  'Market Access', 'Commercial Development', 'Business Development', 'External Innovation', 'Search & Evaluation',
  'Open Innovation', 'R&D Innovation', 'Clinical Development', 'Clinical Operations', 'Study Start-Up',
  'Clinical Trial', 'Clinical Modeling', 'Real World Data', 'RWD', 'Real World Evidence', 'RWE',
  'Medical Affairs', 'Integrated Healthcare Solution', 'Evidence Generation', 'Regulatory', 'CTA', 'NDA',
  'Clinical Application', 'Solution Marketing', 'Scientific Marketing', 'KOL', 'Medical Education',
  'Scientific Communication', 'Medical Device R&D', 'Translational Research', 'Healthcare Digital Transformation',
];
```

- [ ] **Step 4: Implement `jd-analysis.mjs`**

Create `scripts/resume-ops/lib/jd-analysis.mjs`:

```js
import { MEDICAL_ARCHETYPES } from './taxonomy.mjs';

const KEYWORD_PHRASES = [
  ...new Set(MEDICAL_ARCHETYPES.flatMap((item) => item.signals)),
  'medical ai', 'healthcare ai', 'clinical trial', 'evidence generation', 'kol engagement',
];

export function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function detectArchetypes(jdText) {
  const normalized = normalizeText(jdText);
  return MEDICAL_ARCHETYPES
    .map((archetype) => {
      const matchedSignals = archetype.signals.filter((signal) => normalized.includes(signal.toLowerCase()));
      return {
        id: archetype.id,
        label: archetype.label,
        score: matchedSignals.length,
        matchedSignals,
      };
    })
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
}

export function extractKeywords(jdText, limit = 12) {
  const normalized = normalizeText(jdText);
  const phraseHits = KEYWORD_PHRASES
    .map((phrase) => phrase.toLowerCase())
    .filter((phrase) => normalized.includes(phrase));
  return [...new Set(phraseHits)]
    .sort((a, b) => b.length - a.length || a.localeCompare(b))
    .slice(0, limit);
}

export function inferRoleLabel(jdText) {
  const firstHeading = String(jdText || '').split('\n').map((line) => line.trim()).find((line) => line && line.length < 120);
  return firstHeading ? firstHeading.replace(/^#+\s*/, '') : 'Medical Digital Role';
}

export function analyzeJD(jdText) {
  const archetypes = detectArchetypes(jdText);
  return {
    roleLabel: inferRoleLabel(jdText),
    archetypes,
    keywords: extractKeywords(jdText, 12),
    domainSignals: archetypes.flatMap((match) => match.matchedSignals),
  };
}
```

- [ ] **Step 5: Run tests to verify pass**

Run:

```bash
node --test scripts/resume-ops/__tests__/taxonomy.test.mjs
```

Expected: PASS with 3 tests.

- [ ] **Step 6: Commit**

```bash
git add scripts/resume-ops/lib/taxonomy.mjs scripts/resume-ops/lib/jd-analysis.mjs scripts/resume-ops/__tests__/taxonomy.test.mjs
git commit -m "feat: add medical JD taxonomy"
```

---

### Task 3: Master Resume Normalization And Adapter

**Files:**
- Create: `scripts/resume-ops/lib/source-resume.mjs`
- Create: `scripts/resume-ops/lib/adapter.mjs`
- Create: `scripts/resume-ops/__tests__/adapter.test.mjs`

**Interfaces:**
- Produces: `loadSourceResume({ rootDir }): Promise<MasterResume>`
- Produces: `adaptResume(masterResume, jdAnalysis): { resume, metadata }`
- Consumes: `analyzeJD()` from Task 2.

- [ ] **Step 1: Write adapter tests**

Create `scripts/resume-ops/__tests__/adapter.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptResume } from '../lib/adapter.mjs';

const masterResume = {
  general: { name: 'Xiaolei Zhu, PhD', email_private: 'zxl1412@gmail.com' },
  summary: 'AI-enabled healthcare innovation leader with radiology, medical imaging, digital health, and product strategy experience.',
  work: [
    { title: 'Digital Solution Brand Management Manager', company: 'Bayer', date: '2023-2024', details: ['Led digital health portfolio strategy for AI-driven medical imaging solutions.'] },
    { title: 'Scientific Specialist', company: 'Siemens Healthineers', date: '2015-2017', details: ['Supported MRI scientific marketing and translational medicine projects.'] },
  ],
  skills: ['Medical imaging, radiology, AI/ML, RAG, Python, R, Matlab, SQL, product strategy.'],
  projects: [
    { title: 'AI-Powered Marketing Research', description: 'Used LLM, RAG, and LangChain for research insight generation.' },
    { title: 'PV.AI Workflow Initiative', description: 'Hospital-partner collaboration on Primovist AI applications.' },
  ],
  education: [],
  certificates: [],
  publications: [],
};

test('adapts resume using existing evidence only', () => {
  const result = adaptResume(masterResume, {
    roleLabel: 'Clinical Modeling & Analytics Innovation Lead',
    keywords: ['clinical modeling', 'rwd', 'medical imaging', 'ai/ml'],
    archetypes: [{ id: 'clinical-modeling-rwd-analytics', label: 'Clinical Modeling, RWD / RWE, and Trial Analytics', matchedSignals: ['clinical modeling'] }],
  });

  assert.equal(result.resume.general.name, 'Xiaolei Zhu, PhD');
  assert.match(result.resume.summary, /medical imaging/i);
  assert.equal(result.metadata.truthWarnings.some((warning) => warning.includes('clinical trial start-up ownership')), true);
  assert.equal(result.metadata.archetypes[0].id, 'clinical-modeling-rwd-analytics');
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
node --test scripts/resume-ops/__tests__/adapter.test.mjs
```

Expected: FAIL with module not found for `../lib/adapter.mjs`.

- [ ] **Step 3: Implement `source-resume.mjs`**

Create `scripts/resume-ops/lib/source-resume.mjs`:

```js
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
```

- [ ] **Step 4: Implement `adapter.mjs`**

Create `scripts/resume-ops/lib/adapter.mjs`:

```js
function scoreText(text, keywords) {
  const normalized = String(text || '').toLowerCase();
  return keywords.reduce((score, keyword) => score + (normalized.includes(String(keyword).toLowerCase()) ? 1 : 0), 0);
}

function rankItems(items, keywords, getText) {
  return [...(items || [])]
    .map((item, index) => ({ item, index, score: scoreText(getText(item), keywords) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.item);
}

function buildSummary(masterResume, jdAnalysis) {
  const archetypeLabel = jdAnalysis.archetypes?.[0]?.label || 'Medical Digital Role';
  const keywordText = jdAnalysis.keywords.slice(0, 5).join(', ');
  return `${masterResume.summary} Target framing for ${archetypeLabel}: emphasizes ${keywordText} through existing medical imaging, healthcare digitalization, AI/ML, and China/APAC implementation evidence.`;
}

export function adaptResume(masterResume, jdAnalysis) {
  const keywords = jdAnalysis.keywords || [];
  const rankedWork = rankItems(masterResume.work, keywords, (job) => [job.title, job.company, ...(job.details || [])].join(' '));
  const rankedProjects = rankItems(masterResume.projects, keywords, (project) => [project.title, project.description].join(' '));
  const resume = {
    ...masterResume,
    summary: buildSummary(masterResume, jdAnalysis),
    work: rankedWork,
    projects: rankedProjects.slice(0, 6),
    targetedRole: jdAnalysis.roleLabel,
    targetedKeywords: keywords,
  };

  return {
    resume,
    metadata: {
      roleLabel: jdAnalysis.roleLabel,
      archetypes: jdAnalysis.archetypes || [],
      keywords,
      generatedAt: new Date().toISOString(),
      rewritePolicy: 'truth-based-reorder-and-reframe',
      selectedProjects: resume.projects.map((project) => project.title).filter(Boolean),
      truthWarnings: [
        'Do not claim direct radiation therapy product ownership unless later source evidence supports it.',
        'Do not claim NMPA registration leadership unless later source evidence supports it.',
        'Do not claim clinical trial start-up ownership, CTA/NDA ownership, signed-deal ownership, or line-management scope unless later source evidence supports it.',
      ],
    },
  };
}
```

- [ ] **Step 5: Run tests to verify pass**

Run:

```bash
node --test scripts/resume-ops/__tests__/adapter.test.mjs scripts/resume-ops/__tests__/taxonomy.test.mjs
```

Expected: PASS with 4 tests.

- [ ] **Step 6: Commit**

```bash
git add scripts/resume-ops/lib/source-resume.mjs scripts/resume-ops/lib/adapter.mjs scripts/resume-ops/__tests__/adapter.test.mjs
git commit -m "feat: add truth-based resume adapter"
```

---

### Task 4: Evaluation, Sync, Adapt, And Build CLIs

**Files:**
- Create: `scripts/resume-ops/lib/evaluation.mjs`
- Create: `scripts/resume-ops/sync-master.mjs`
- Create: `scripts/resume-ops/adapt-resume.mjs`
- Create: `scripts/resume-ops/build-version.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces CLI commands:
  - `npm run resume:sync`
  - `npm run resume:adapt -- --jd career/jds/sample-medical-digital-role.md --slug sample-medical-digital-role`
  - `npm run resume:build -- --jd career/jds/sample-medical-digital-role.md --slug sample-medical-digital-role`

- [ ] **Step 1: Write `evaluation.mjs`**

Create `scripts/resume-ops/lib/evaluation.mjs`:

```js
export function renderEvaluation({ jdAnalysis, metadata }) {
  const primary = jdAnalysis.archetypes?.[0];
  const lines = [
    `# Evaluation: ${metadata.roleLabel}`,
    '',
    `**Generated:** ${metadata.generatedAt}`,
    `**Primary Archetype:** ${primary ? primary.label : 'Unclassified Medical Role'}`,
    `**Keywords:** ${metadata.keywords.join(', ') || 'None detected'}`,
    '',
    '## Block A - Role And Market Context',
    '',
    `This role is framed as ${primary ? primary.label : 'a healthcare role requiring manual review'}. Stakeholders may include clinical, medical affairs, R&D, commercial, access, KOL, hospital, vendor, and regulatory partners depending on the JD.`,
    '',
    '## Block B - Resume Evidence Match',
    '',
    '- Direct evidence should be cited from the latest resume PDF, Web resume Markdown, and structured resume JSON during review.',
    '- Adjacent evidence should be labelled as adjacent rather than presented as direct ownership.',
    '',
    '## Block C - HR Screen And Level Strategy',
    '',
    '- First-page language should highlight healthcare AI, medical imaging, China/APAC localization, scientific credibility, and product/commercial translation.',
    '',
    '## Block D - Business Impact, KPI, And Industry Insight',
    '',
    '- Use archetype-specific KPI domains from `career/modes/_shared.md` to infer hidden hiring needs.',
    '',
    '## Block E - Resume, Web, PDF, And LinkedIn Customization Plan',
    '',
    '- Use the generated resume JSON as the first adaptation pass. Review metadata truth warnings before sending externally.',
    '',
    '## Block F - Interview And Narrative Plan',
    '',
    '- Prepare STAR+R stories for cross-functional leadership, medical AI enablement, hospital/KOL collaboration, digital platform strategy, and scientific communication.',
    '',
    '## Block G - Posting Legitimacy',
    '',
    '- URL liveness is not verified by this deterministic local pass. Verify manually or with the separate scanner workflow before prioritizing an application.',
    '',
    '## Truth Warnings',
    '',
    ...metadata.truthWarnings.map((warning) => `- ${warning}`),
    '',
  ];
  return lines.join('\n');
}
```

- [ ] **Step 2: Write CLI argument helper inside `adapt-resume.mjs`**

Create `scripts/resume-ops/adapt-resume.mjs`:

```js
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { analyzeJD } from './lib/jd-analysis.mjs';
import { loadSourceResume } from './lib/source-resume.mjs';
import { adaptResume } from './lib/adapter.mjs';
import { renderEvaluation } from './lib/evaluation.mjs';

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
    slug: args.get('slug') || 'sample-medical-digital-role',
  };
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function main(argv = process.argv.slice(2)) {
  const { jdPath, slug } = parseArgs(argv);
  if (!jdPath) throw new Error('Missing --jd path');
  const jdText = await readFile(jdPath, 'utf8');
  const masterResume = await loadSourceResume({ rootDir: process.cwd(), language: 'en' });
  const jdAnalysis = analyzeJD(jdText);
  const { resume, metadata } = adaptResume(masterResume, jdAnalysis);
  const outDir = join(process.cwd(), 'career', 'versions', slug);
  await writeJson(join(outDir, 'resume.json'), resume);
  await writeJson(join(outDir, 'metadata.json'), metadata);
  await writeFile(join(outDir, 'evaluation.md'), renderEvaluation({ jdAnalysis, metadata }), 'utf8');
  console.log(`Generated career/versions/${slug}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
```

- [ ] **Step 3: Write `sync-master.mjs` and `build-version.mjs`**

Create `scripts/resume-ops/sync-master.mjs`:

```js
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
```

Create `scripts/resume-ops/build-version.mjs`:

```js
import { main as adaptMain } from './adapt-resume.mjs';

await adaptMain(process.argv.slice(2));
console.log('Version build complete. Run npm run resume:pdf after Task 5 adds PDF rendering.');
```

- [ ] **Step 4: Modify `package.json` scripts**

Add these scripts without removing existing scripts:

```json
"resume:test": "node --test scripts/resume-ops/__tests__/*.test.mjs",
"resume:sync": "node scripts/resume-ops/sync-master.mjs",
"resume:adapt": "node scripts/resume-ops/adapt-resume.mjs",
"resume:build": "node scripts/resume-ops/build-version.mjs"
```

- [ ] **Step 5: Run CLI verification**

Run:

```bash
npm run resume:test
npm run resume:sync
npm run resume:adapt -- --jd career/jds/sample-medical-digital-role.md --slug sample-medical-digital-role
```

Expected:

- Tests pass.
- `career/data/master-resume.json` exists.
- `career/versions/sample-medical-digital-role/resume.json` exists.
- `career/versions/sample-medical-digital-role/metadata.json` contains medical archetypes.
- `career/versions/sample-medical-digital-role/evaluation.md` contains A-G blocks.

- [ ] **Step 6: Commit**

```bash
git add package.json career/data/master-resume.json career/data/master-resume.zh.json career/versions/sample-medical-digital-role scripts/resume-ops
git commit -m "feat: generate medical resume versions"
```

---

### Task 5: Print HTML And PDF Rendering

**Files:**
- Create: `scripts/resume-ops/lib/render-print-html.mjs`
- Create: `scripts/resume-ops/render-pdf.mjs`
- Modify: `package.json`
- Generated: `career/versions/sample-medical-digital-role/print.html`
- Generated: `career/output/cv-sample-medical-digital-role-YYYY-MM-DD.pdf`
- Generated: `public/generated-resumes/cv-sample-medical-digital-role-YYYY-MM-DD.pdf`

**Interfaces:**
- Produces: `renderPrintHtml({ resume, metadata, template }): string`
- Produces CLI: `npm run resume:pdf -- --slug sample-medical-digital-role`

- [ ] **Step 1: Install dependencies**

Run:

```bash
npm install js-yaml playwright
```

Expected: `package.json` and `package-lock.json` include `js-yaml` and `playwright`.

- [ ] **Step 2: Implement print HTML renderer**

Create `scripts/resume-ops/lib/render-print-html.mjs`:

```js
function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function section(title, body) {
  return `<section><h2>${escapeHtml(title)}</h2>${body}</section>`;
}

function list(items) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function renderExperience(work = []) {
  return work.slice(0, 6).map((job) => `
    <div class="item">
      <div class="item-head"><span>${escapeHtml(job.title)} - ${escapeHtml(job.company)}</span><span class="muted">${escapeHtml(job.date)}</span></div>
      ${list(job.details || [])}
    </div>
  `).join('');
}

function renderProjects(projects = []) {
  return projects.slice(0, 5).map((project) => `
    <div class="item">
      <div class="item-head"><span>${escapeHtml(project.title)}</span></div>
      <p>${escapeHtml(project.description || '')}</p>
    </div>
  `).join('');
}

export function renderPrintHtml({ resume, metadata, template }) {
  const contact = [
    resume.general?.address,
    resume.general?.email_private || resume.general?.email_work,
    resume.general?.linkedin,
    resume.general?.github,
  ].filter(Boolean).map(escapeHtml).join('<span>|</span>');

  const body = [
    section('Professional Summary', `<p>${escapeHtml(resume.summary)}</p>`),
    section('Core Competencies', `<div class="tags">${(resume.targetedKeywords || []).slice(0, 10).map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join('')}</div>`),
    section('Work Experience', renderExperience(resume.work)),
    section('Selected Projects', renderProjects(resume.projects)),
    section('Education', renderProjects((resume.education || []).map((edu) => ({ title: `${edu.degree} - ${edu.institution}`, description: `${edu.major || ''} ${edu.date || ''}` })))),
    section('Truth Notes', list(metadata.truthWarnings || [])),
  ].join('\n');

  return template
    .replaceAll('{{LANG}}', resume.language || 'en')
    .replaceAll('{{NAME}}', escapeHtml(resume.general?.name || 'Xiaolei Zhu, PhD'))
    .replaceAll('{{ROLE_LABEL}}', escapeHtml(metadata.roleLabel || 'Medical Digital Role'))
    .replaceAll('{{CONTACT}}', contact)
    .replaceAll('{{BODY}}', body);
}
```

- [ ] **Step 3: Implement PDF CLI**

Create `scripts/resume-ops/render-pdf.mjs`:

```js
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
```

- [ ] **Step 4: Modify `package.json` script**

Add:

```json
"resume:pdf": "node scripts/resume-ops/render-pdf.mjs"
```

- [ ] **Step 5: Run PDF verification**

Run:

```bash
npm run resume:pdf -- --slug sample-medical-digital-role
pdfinfo career/output/cv-sample-medical-digital-role-$(date +%F).pdf
pdftoppm -png career/output/cv-sample-medical-digital-role-$(date +%F).pdf /tmp/resume-ops-sample
```

Expected:

- `pdfinfo` reports at least 1 page.
- `/tmp/resume-ops-sample-1.png` renders.
- Visual inspection shows no clipped header, overlapping text, or unreadable glyphs.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json career/templates/resume-print.html scripts/resume-ops career/versions/sample-medical-digital-role public/generated-resumes career/output
git commit -m "feat: render tailored resume pdfs"
```

---

### Task 6: Version Manifest And React Integration

**Files:**
- Create: `scripts/resume-ops/generate-manifest.mjs`
- Create: `src/data/resume-versions.json`
- Modify: `src/App.jsx`
- Modify: `src/components/Header.jsx`
- Modify: `package.json`

**Interfaces:**
- Produces: `npm run resume:manifest`
- React consumes: `src/data/resume-versions.json`

- [ ] **Step 1: Implement manifest generator**

Create `scripts/resume-ops/generate-manifest.mjs`:

```js
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

async function pathExists(path) {
  try {
    await readFile(path, 'utf8');
    return true;
  } catch {
    return false;
  }
}

const root = process.cwd();
const versionsDir = join(root, 'career', 'versions');
const slugs = await readdir(versionsDir);
const versions = [];

for (const slug of slugs) {
  const metadataPath = join(versionsDir, slug, 'metadata.json');
  const resumePath = join(versionsDir, slug, 'resume.json');
  if (!(await pathExists(metadataPath)) || !(await pathExists(resumePath))) continue;
  const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
  const resume = JSON.parse(await readFile(resumePath, 'utf8'));
  versions.push({
    slug,
    label: metadata.roleLabel || slug,
    archetype: metadata.archetypes?.[0]?.label || 'Medical Role',
    generatedAt: metadata.generatedAt,
    pdfPath: metadata.pdf?.publicPath || '',
    resume,
    metadata,
  });
}

versions.sort((a, b) => String(b.generatedAt).localeCompare(String(a.generatedAt)));
await mkdir(join(root, 'src', 'data'), { recursive: true });
await writeFile(join(root, 'src', 'data', 'resume-versions.json'), `${JSON.stringify(versions, null, 2)}\n`, 'utf8');
console.log(`Wrote ${versions.length} resume version(s)`);
```

- [ ] **Step 2: Modify package scripts**

Add:

```json
"resume:manifest": "node scripts/resume-ops/generate-manifest.mjs"
```

- [ ] **Step 3: Modify `src/components/Header.jsx` props and controls**

Change the function signature to:

```jsx
export default function Header({ lang, setLang, dark, setDark, onDownload, versions = [], selectedVersion, setSelectedVersion }) {
```

Add this control before the PDF button:

```jsx
{versions.length > 0 && (
  <select
    className="btn-secondary max-w-48"
    value={selectedVersion}
    onChange={(event) => setSelectedVersion(event.target.value)}
    title={lang === 'en' ? 'Resume version' : '简历版本'}
  >
    <option value="default">{lang === 'en' ? 'Default' : '默认'}</option>
    {versions.map((version) => (
      <option key={version.slug} value={version.slug}>
        {version.label}
      </option>
    ))}
  </select>
)}
```

- [ ] **Step 4: Modify `src/App.jsx` data selection**

Import versions:

```jsx
import resumeVersions from './data/resume-versions.json'
```

Add state:

```jsx
const [selectedVersion, setSelectedVersion] = useState('default')
```

Replace data selection with:

```jsx
const version = resumeVersions.find((item) => item.slug === selectedVersion)
const data = version?.resume || (lang === 'en' ? resumeEn : resumeZh)
```

Update `handleDownload`:

```jsx
const handleDownload = () => {
  if (version?.pdfPath) {
    const link = document.createElement('a')
    link.href = version.pdfPath
    link.download = `${version.slug}.pdf`
    link.click()
    return
  }
  const link = document.createElement('a')
  link.href = '/resume-xiaolei-zhu.pdf'
  link.download = `Xiaolei_Zhu_Resume_${lang.toUpperCase()}.pdf`
  link.click()
}
```

Pass props to `Header`:

```jsx
versions={resumeVersions}
selectedVersion={selectedVersion}
setSelectedVersion={setSelectedVersion}
```

- [ ] **Step 5: Generate manifest and build**

Run:

```bash
npm run resume:manifest
npm run build
```

Expected:

- `src/data/resume-versions.json` contains the sample version.
- `npm run build` completes successfully.

- [ ] **Step 6: Commit**

```bash
git add package.json scripts/resume-ops/generate-manifest.mjs src/App.jsx src/components/Header.jsx src/data/resume-versions.json
git commit -m "feat: preview tailored resume versions"
```

---

### Task 7: Scanner Configuration And Documentation

**Files:**
- Modify: `career/templates/portals.example.yml`
- Create: `career/README.md`
- Modify: `README.md`

**Interfaces:**
- Produces: human-usable guidance for `career/` workflows and scanner setup.

- [ ] **Step 1: Replace scanner template with complete medical filters**

Replace `career/templates/portals.example.yml` with:

```yaml
title_filter:
  positive:
    - "Digital Health"
    - "Healthcare IT"
    - "Medical AI"
    - "Clinical AI"
    - "Imaging AI"
    - "Radiology"
    - "Oncology"
    - "Product Marketing"
    - "Product Manager"
    - "Portfolio Manager"
    - "External Innovation"
    - "Search & Evaluation"
    - "Open Innovation"
    - "R&D Innovation"
    - "Clinical Development"
    - "Clinical Operations"
    - "Study Start-Up"
    - "Clinical Modeling"
    - "Real World Evidence"
    - "Medical Affairs"
    - "Evidence Generation"
    - "Medical Device R&D"
  negative:
    - "Intern"
    - "Junior"
    - "Nurse"
    - "Physician"
    - "CRA"
    - "CRC"
    - "Firmware"
    - "Manufacturing"
    - "Insurance Claims"
```

Add company category comments for medical imaging, radiation oncology, pharma R&D, healthcare IT, medical AI, clinical research/RWD, and cloud healthcare platforms.

- [ ] **Step 2: Create `career/README.md`**

Create:

```markdown
# Medical Resume-Ops

This workspace contains Xiaolei Zhu's medical/pharma resume adaptation system.

## Commands

- `npm run resume:sync` updates `career/data/master-resume.json` from the current Web resume data.
- `npm run resume:adapt -- --jd career/jds/sample-medical-digital-role.md --slug sample-medical-digital-role` generates a tailored resume version.
- `npm run resume:pdf -- --slug sample-medical-digital-role` renders a PDF and copies it to the public site assets.
- `npm run resume:manifest` updates the React version manifest.

## Truth Rules

The system can reframe and reorder existing evidence. It must not invent direct radiation therapy ownership, NMPA registration leadership, CTA/NDA ownership, signed deals, line management, or metrics not present in source evidence.
```

- [ ] **Step 3: Add root README note**

Append a short section to `README.md`:

```markdown
## Medical Resume-Ops

This project includes a local `career/` workspace for JD-specific medical/pharma resume adaptation and PDF generation. See `career/README.md` for commands.
```

- [ ] **Step 4: Run final verification**

Run:

```bash
npm run resume:test
npm run resume:sync
npm run resume:adapt -- --jd career/jds/sample-medical-digital-role.md --slug sample-medical-digital-role
npm run resume:pdf -- --slug sample-medical-digital-role
npm run resume:manifest
npm run build
```

Expected: all commands succeed and a sample PDF exists under both `career/output/` and `public/generated-resumes/`.

- [ ] **Step 5: Commit**

```bash
git add career/README.md career/templates/portals.example.yml README.md
git commit -m "docs: document medical resume-ops workflow"
```

---

## Verification Checklist

- [ ] `npm run resume:test` passes.
- [ ] `npm run resume:sync` creates English and Chinese master resume JSON.
- [ ] `npm run resume:adapt -- --jd career/jds/sample-medical-digital-role.md --slug sample-medical-digital-role` creates `resume.json`, `metadata.json`, and `evaluation.md`.
- [ ] `metadata.json` contains one of the medical/pharma archetypes, not the original AI architect archetypes.
- [ ] `npm run resume:pdf -- --slug sample-medical-digital-role` creates a non-empty PDF.
- [ ] `pdfinfo` reports a valid PDF and `pdftoppm` renders at least page 1.
- [ ] Visual PDF inspection shows readable text, no overlap, no clipped header, and reasonable section spacing.
- [ ] `npm run resume:manifest` creates `src/data/resume-versions.json`.
- [ ] `npm run build` passes.
- [ ] Web default resume still loads.
- [ ] Web version selector shows the sample tailored version.
- [ ] PDF download uses the selected version when a version is selected.
