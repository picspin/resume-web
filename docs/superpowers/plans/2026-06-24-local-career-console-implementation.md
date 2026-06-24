# Local Career Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-only `/career` job application console that reviews generated resume versions, evidence, truth warnings, and manual application packs without exposing private career artifacts in the public resume build.

**Architecture:** Keep the public resume page as the default app. Add an explicit Vite env gate for `/career`, split generated data into a public-safe resume manifest and a local-only career manifest, then render a small local console from focused React components plus pure state/data helpers.

**Tech Stack:** React 18, Vite 4, Tailwind utility classes, Node ESM scripts, `node:test`, existing `resume-ops` CLI scripts.

## Global Constraints

- The console is local-development first.
- Production builds must not display a `/career` navigation entry.
- Production builds must not bundle detailed local career artifacts by default.
- No automated job-board crawling in this phase.
- No automated form submission or one-click application submit.
- No production user accounts, membership system, or multi-user database.
- No replacement of the current resume landing page layout.
- No server-side write API in the static GitHub Pages deployment.
- Truth warnings are review-only and must not appear in external PDF output unless an explicit review mode is added.
- State is stored in `localStorage` for the MVP with storage key `resumeOps.applications.v1`.

---

## File Structure

- Create `src/career/careerConsoleEnabled.js`: pure env/path gate for `/career`.
- Create `src/career/__tests__/careerConsoleEnabled.test.mjs`: Node tests for the gate.
- Create `scripts/resume-ops/lib/manifest.mjs`: manifest builder that returns public-safe and local-only career records.
- Modify `scripts/resume-ops/generate-manifest.mjs`: call the manifest builder and write both manifests.
- Modify `.gitignore`: ignore `src/data/career-versions.local.json`.
- Create `scripts/resume-ops/__tests__/manifest.test.mjs`: tests for public/private manifest split.
- Create `src/career/applicationState.js`: pure localStorage parsing, defaulting, and update helpers.
- Create `src/career/useApplicationState.js`: React hook wrapper around `applicationState.js`.
- Create `src/career/__tests__/applicationState.test.mjs`: Node tests for local state behavior.
- Create `src/career/careerRows.js`: derive board rows, selected version details, missing PDF state, and command hints.
- Create `src/career/__tests__/careerRows.test.mjs`: Node tests for row derivation.
- Create `src/career/careerData.js`: fetch the ignored local career manifest at runtime in local dev without bundling it.
- Create `src/career/CareerConsole.jsx`: local console shell and state wiring.
- Create `src/career/ApplicationBoard.jsx`: list generated versions and statuses.
- Create `src/career/EvidenceReview.jsx`: display archetypes, keywords, evaluation text, and truth warnings.
- Create `src/career/ApplyPack.jsx`: manual application pack editor.
- Create `src/career/JdIntakeHelper.jsx`: local JD command helper.
- Modify `src/App.jsx`: render `CareerConsole` only for enabled `/career`; otherwise keep public resume behavior.
- Modify `package.json`: add `career:test`.
- Modify `career/README.md`: document local console usage and privacy boundary.

---

### Task 1: Add The Local `/career` Gate

**Files:**
- Create: `src/career/careerConsoleEnabled.js`
- Create: `src/career/__tests__/careerConsoleEnabled.test.mjs`
- Modify: `src/App.jsx`
- Modify: `package.json`

**Interfaces:**
- Produces: `isCareerConsoleEnabled({ env, pathname }) => boolean`
- Produces: `isCareerPath(pathname) => boolean`
- Consumes later: Task 4 uses the gate before rendering `CareerConsole`.

- [ ] **Step 1: Write the failing gate tests**

Create `src/career/__tests__/careerConsoleEnabled.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { isCareerConsoleEnabled, isCareerPath } from '../careerConsoleEnabled.js';

test('recognizes the local career route exactly', () => {
  assert.equal(isCareerPath('/career'), true);
  assert.equal(isCareerPath('/career/'), true);
  assert.equal(isCareerPath('/career?x=1'), true);
  assert.equal(isCareerPath('/'), false);
  assert.equal(isCareerPath('/career-public'), false);
});

test('requires an explicit Vite enable flag', () => {
  assert.equal(isCareerConsoleEnabled({ env: { VITE_ENABLE_CAREER_CONSOLE: 'true' }, pathname: '/career' }), true);
  assert.equal(isCareerConsoleEnabled({ env: { VITE_ENABLE_CAREER_CONSOLE: '1' }, pathname: '/career' }), true);
  assert.equal(isCareerConsoleEnabled({ env: { VITE_ENABLE_CAREER_CONSOLE: 'false' }, pathname: '/career' }), false);
  assert.equal(isCareerConsoleEnabled({ env: {}, pathname: '/career' }), false);
  assert.equal(isCareerConsoleEnabled({ env: { VITE_ENABLE_CAREER_CONSOLE: 'true' }, pathname: '/' }), false);
});
```

- [ ] **Step 2: Run the failing test**

Run: `node --test src/career/__tests__/careerConsoleEnabled.test.mjs`

Expected: FAIL with module not found for `careerConsoleEnabled.js`.

- [ ] **Step 3: Implement the gate**

Create `src/career/careerConsoleEnabled.js`:

```js
export function isCareerPath(pathname = '/') {
  const path = String(pathname || '/').split('?')[0].replace(/\/$/, '') || '/';
  return path === '/career';
}

export function isCareerConsoleEnabled({ env = {}, pathname = '/' } = {}) {
  const enabled = String(env.VITE_ENABLE_CAREER_CONSOLE || '').toLowerCase();
  return isCareerPath(pathname) && (enabled === 'true' || enabled === '1');
}
```

- [ ] **Step 4: Add a test script**

Modify `package.json` scripts:

```json
"career:test": "node --test src/career/__tests__/*.test.mjs",
```

Keep the existing `resume:test` script unchanged.

- [ ] **Step 5: Wire the disabled route into `App.jsx` without loading private data**

Modify `src/App.jsx` imports:

```js
import { isCareerConsoleEnabled, isCareerPath } from './career/careerConsoleEnabled'
import CareerConsole from './career/CareerConsole'
```

At the top of `App()` after state setup, add:

```js
const pathname = window.location.pathname
const careerEnabled = isCareerConsoleEnabled({ env: import.meta.env, pathname })

if (careerEnabled) {
  return <CareerConsole />
}

if (isCareerPath(pathname)) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold mb-3">Career console is local-only</h1>
        <p className="text-gray-600">Run the dev server with VITE_ENABLE_CAREER_CONSOLE=true to open this workspace.</p>
      </div>
    </div>
  )
}
```

This step will not compile until Task 5 creates `CareerConsole.jsx`. To keep this task independently buildable, create a temporary minimal `src/career/CareerConsole.jsx`:

```jsx
export default function CareerConsole() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold mb-3">Career Console</h1>
        <p className="text-gray-600">Local application workflow is enabled.</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Verify Task 1**

Run:

```bash
npm run career:test
npm run build
```

Expected: career tests PASS; build PASS. The build must not require `VITE_ENABLE_CAREER_CONSOLE`.

- [ ] **Step 7: Commit Task 1**

```bash
git add package.json src/App.jsx src/career/careerConsoleEnabled.js src/career/CareerConsole.jsx src/career/__tests__/careerConsoleEnabled.test.mjs
git commit -m "feat: gate local career console route"
```

---

### Task 2: Split Public And Local Career Manifests

**Files:**
- Create: `scripts/resume-ops/lib/manifest.mjs`
- Create: `scripts/resume-ops/__tests__/manifest.test.mjs`
- Modify: `scripts/resume-ops/generate-manifest.mjs`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `buildManifestEntry({ slug, metadata, resume, evaluationMarkdown }) => { publicEntry, careerEntry }`
- Produces: `buildManifests(versionRecords) => { publicVersions, careerVersions }`
- Produces local file: `src/data/career-versions.local.json`
- Preserves public file: `src/data/resume-versions.json`

- [ ] **Step 1: Write failing manifest split tests**

Create `scripts/resume-ops/__tests__/manifest.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildManifestEntry, buildManifests } from '../lib/manifest.mjs';

const resume = {
  general: { name: 'Xiaolei Zhu, PhD' },
  summary: 'Tailored summary',
  targetedKeywords: ['medical ai'],
};

const metadata = {
  roleLabel: 'Medical AI Lead',
  generatedAt: '2026-06-24T00:00:00.000Z',
  archetypes: [{ id: 'medical-ai-clinical-workflow', label: 'Medical AI / Clinical Workflow Solution' }],
  keywords: ['medical ai'],
  truthWarnings: ['Do not claim unsupported ownership.'],
  pdf: { publicPath: '/generated-resumes/cv-medical-ai.pdf' },
};

test('public manifest omits private review metadata', () => {
  const { publicEntry } = buildManifestEntry({ slug: 'medical-ai', metadata, resume, evaluationMarkdown: '# Review' });
  assert.equal(publicEntry.slug, 'medical-ai');
  assert.equal(publicEntry.label, 'Medical AI Lead');
  assert.equal(publicEntry.pdfPath, '/generated-resumes/cv-medical-ai.pdf');
  assert.equal(Object.hasOwn(publicEntry, 'metadata'), false);
  assert.equal(Object.hasOwn(publicEntry, 'evaluationMarkdown'), false);
});

test('local career manifest includes review metadata and evaluation text', () => {
  const { careerEntry } = buildManifestEntry({ slug: 'medical-ai', metadata, resume, evaluationMarkdown: '# Review' });
  assert.deepEqual(careerEntry.metadata.truthWarnings, ['Do not claim unsupported ownership.']);
  assert.equal(careerEntry.evaluationMarkdown, '# Review');
});

test('manifests sort newest first', () => {
  const older = { slug: 'older', metadata: { ...metadata, generatedAt: '2026-01-01T00:00:00.000Z', roleLabel: 'Older' }, resume, evaluationMarkdown: '' };
  const newer = { slug: 'newer', metadata: { ...metadata, generatedAt: '2026-06-24T00:00:00.000Z', roleLabel: 'Newer' }, resume, evaluationMarkdown: '' };
  const { publicVersions } = buildManifests([older, newer]);
  assert.deepEqual(publicVersions.map((item) => item.slug), ['newer', 'older']);
});
```

- [ ] **Step 2: Run the failing test**

Run: `node --test scripts/resume-ops/__tests__/manifest.test.mjs`

Expected: FAIL with module not found for `../lib/manifest.mjs`.

- [ ] **Step 3: Implement manifest helpers**

Create `scripts/resume-ops/lib/manifest.mjs`:

```js
export function buildManifestEntry({ slug, metadata, resume, evaluationMarkdown = '' }) {
  const publicEntry = {
    slug,
    label: metadata.roleLabel || slug,
    archetype: metadata.archetypes?.[0]?.label || 'Medical Role',
    generatedAt: metadata.generatedAt,
    pdfPath: metadata.pdf?.publicPath || '',
    resume,
  };

  const careerEntry = {
    ...publicEntry,
    metadata,
    evaluationMarkdown,
  };

  return { publicEntry, careerEntry };
}

export function buildManifests(versionRecords) {
  const entries = versionRecords.map(buildManifestEntry);
  const sortByGeneratedAt = (a, b) => String(b.generatedAt || '').localeCompare(String(a.generatedAt || ''));

  return {
    publicVersions: entries.map((entry) => entry.publicEntry).sort(sortByGeneratedAt),
    careerVersions: entries.map((entry) => entry.careerEntry).sort(sortByGeneratedAt),
  };
}
```

- [ ] **Step 4: Update generator script**

Modify `scripts/resume-ops/generate-manifest.mjs` so it imports helpers and writes two files:

```js
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { buildManifests } from './lib/manifest.mjs'
```

Replace the current `versions` push logic with:

```js
const records = []

for (const slug of slugs) {
  const metadataPath = join(versionsDir, slug, 'metadata.json')
  const resumePath = join(versionsDir, slug, 'resume.json')
  const evaluationPath = join(versionsDir, slug, 'evaluation.md')
  if (!(await pathExists(metadataPath)) || !(await pathExists(resumePath))) continue
  const metadata = JSON.parse(await readFile(metadataPath, 'utf8'))
  const resume = JSON.parse(await readFile(resumePath, 'utf8'))
  const evaluationMarkdown = await pathExists(evaluationPath) ? await readFile(evaluationPath, 'utf8') : ''
  records.push({ slug, metadata, resume, evaluationMarkdown })
}

const { publicVersions, careerVersions } = buildManifests(records)
await mkdir(join(root, 'src', 'data'), { recursive: true })
await writeFile(join(root, 'src', 'data', 'resume-versions.json'), `${JSON.stringify(publicVersions, null, 2)}\n`, 'utf8')
await writeFile(join(root, 'src', 'data', 'career-versions.local.json'), `${JSON.stringify(careerVersions, null, 2)}\n`, 'utf8')
console.log(`Wrote ${publicVersions.length} public resume version(s) and ${careerVersions.length} local career version(s)`)
```

- [ ] **Step 5: Ignore the local-only manifest**

Modify `.gitignore`:

```gitignore
src/data/career-versions.local.json
```

Do not ignore `src/data/resume-versions.json`.

- [ ] **Step 6: Verify Task 2**

Run:

```bash
npm run resume:test
npm run resume:manifest
npm run build
git status --short --ignored
```

Expected:
- tests PASS
- build PASS
- `src/data/career-versions.local.json` appears as ignored, not staged
- `src/data/resume-versions.json` no longer contains `truthWarnings` or `evaluationMarkdown`

- [ ] **Step 7: Commit Task 2**

```bash
git add .gitignore scripts/resume-ops/lib/manifest.mjs scripts/resume-ops/__tests__/manifest.test.mjs scripts/resume-ops/generate-manifest.mjs src/data/resume-versions.json
git commit -m "feat: split public and local career manifests"
```

---

### Task 3: Add Application State And Row Derivation

**Files:**
- Create: `src/career/applicationState.js`
- Create: `src/career/useApplicationState.js`
- Create: `src/career/careerRows.js`
- Create: `src/career/__tests__/applicationState.test.mjs`
- Create: `src/career/__tests__/careerRows.test.mjs`

**Interfaces:**
- Produces: `CAREER_STORAGE_KEY = 'resumeOps.applications.v1'`
- Produces: `readApplicationState(storage) => object`
- Produces: `writeApplicationState(storage, state) => void`
- Produces: `updateApplicationRecord(state, slug, patch, now) => object`
- Produces: `deriveCareerRows({ versions, applicationState }) => Array`
- Produces: `getDefaultApplyDraft(version) => object`
- Consumes later: Task 5 UI components use these helpers.

- [ ] **Step 1: Write failing application state tests**

Create `src/career/__tests__/applicationState.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAREER_STORAGE_KEY,
  readApplicationState,
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

test('updates one slug with default status and timestamp', () => {
  const next = updateApplicationRecord({}, 'medical-ai', { status: 'ready_to_apply', notes: 'Confirm summary' }, '2026-06-24T00:00:00.000Z');
  assert.equal(Object.hasOwn(next, 'medical-ai'), true);
  assert.equal(next['medical-ai'].status, 'ready_to_apply');
  assert.equal(next['medical-ai'].notes, 'Confirm summary');
  assert.equal(next['medical-ai'].updatedAt, '2026-06-24T00:00:00.000Z');
});
```

- [ ] **Step 2: Run failing application state tests**

Run: `node --test src/career/__tests__/applicationState.test.mjs`

Expected: FAIL with module not found for `applicationState.js`.

- [ ] **Step 3: Implement application state helpers**

Create `src/career/applicationState.js`:

```js
export const CAREER_STORAGE_KEY = 'resumeOps.applications.v1';
export const DEFAULT_STATUS = 'generated';

export function readApplicationState(storage = window.localStorage) {
  if (!storage) return {};
  try {
    const raw = storage.getItem(CAREER_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function writeApplicationState(storage = window.localStorage, state = {}) {
  if (!storage) return;
  storage.setItem(CAREER_STORAGE_KEY, JSON.stringify(state));
}

export function updateApplicationRecord(state = {}, slug, patch = {}, now = new Date().toISOString()) {
  if (!slug) return state;
  return {
    ...state,
    [slug]: {
      status: DEFAULT_STATUS,
      ...state[slug],
      ...patch,
      updatedAt: now,
    },
  };
}
```

- [ ] **Step 4: Add React hook wrapper**

Create `src/career/useApplicationState.js`:

```js
import { useCallback, useEffect, useState } from 'react';
import { readApplicationState, updateApplicationRecord, writeApplicationState } from './applicationState';

export function useApplicationState(storage = window.localStorage) {
  const [applicationState, setApplicationState] = useState(() => readApplicationState(storage));

  useEffect(() => {
    writeApplicationState(storage, applicationState);
  }, [applicationState, storage]);

  const updateRecord = useCallback((slug, patch) => {
    setApplicationState((current) => updateApplicationRecord(current, slug, patch));
  }, []);

  return { applicationState, updateRecord };
}
```

- [ ] **Step 5: Write failing row tests**

Create `src/career/__tests__/careerRows.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveCareerRows, getDefaultApplyDraft } from '../careerRows.js';

const version = {
  slug: 'medical-ai',
  label: 'Medical AI Lead',
  archetype: 'Medical AI / Clinical Workflow Solution',
  generatedAt: '2026-06-24T00:00:00.000Z',
  pdfPath: '/generated-resumes/cv-medical-ai.pdf',
  resume: { summary: 'Medical AI summary' },
  metadata: {
    keywords: ['medical ai'],
    truthWarnings: ['Do not overclaim.'],
    selectedProjects: ['PV.AI Workflow Initiative'],
  },
  evaluationMarkdown: '# Evaluation\n\n- **medical ai:** Adjacent evidence',
};

test('derives rows with default generated status', () => {
  const rows = deriveCareerRows({ versions: [version], applicationState: {} });
  assert.equal(rows[0].slug, 'medical-ai');
  assert.equal(rows[0].status, 'generated');
  assert.equal(rows[0].hasPdf, true);
  assert.equal(rows[0].nextAction, 'Review evidence');
});

test('uses saved state over defaults', () => {
  const rows = deriveCareerRows({
    versions: [version],
    applicationState: { 'medical-ai': { status: 'applied', applicationUrl: 'https://jobs.example/1' } },
  });
  assert.equal(rows[0].status, 'applied');
  assert.equal(rows[0].applicationUrl, 'https://jobs.example/1');
  assert.equal(rows[0].nextAction, 'Follow up');
});

test('builds deterministic manual apply draft', () => {
  const draft = getDefaultApplyDraft(version);
  assert.match(draft.hrMessage, /Medical AI Lead/);
  assert.match(draft.emailBody, /Medical AI summary/);
  assert.match(draft.linkedInMessage, /Medical AI Lead/);
});
```

- [ ] **Step 6: Implement row helpers**

Create `src/career/careerRows.js`:

```js
const NEXT_ACTION_BY_STATUS = {
  jd_captured: 'Generate resume',
  generated: 'Review evidence',
  reviewing: 'Resolve gaps',
  ready_to_apply: 'Submit manually',
  applied: 'Follow up',
  follow_up: 'Track response',
  closed: 'Archive',
};

export function deriveCareerRows({ versions = [], applicationState = {} } = {}) {
  return versions.map((version) => {
    const saved = applicationState[version.slug] || {};
    const status = saved.status || 'generated';
    return {
      ...version,
      ...saved,
      status,
      hasPdf: Boolean(version.pdfPath),
      nextAction: NEXT_ACTION_BY_STATUS[status] || 'Review evidence',
    };
  });
}

export function getDefaultApplyDraft(version) {
  const label = version?.label || 'the role';
  const summary = version?.resume?.summary || 'my healthcare digital and medical AI background';
  const archetype = version?.archetype || 'medical role';

  return {
    hrMessage: `Hello, I am interested in ${label}. My background combines ${archetype}, medical imaging, healthcare digitalization, and cross-functional China/APAC execution.`,
    linkedInMessage: `Hello, I noticed the ${label} opening and would value the chance to connect. My experience spans medical imaging, digital health, and AI-enabled healthcare solutions.`,
    emailBody: `Dear Hiring Team,\n\nI am writing to apply for ${label}. ${summary}\n\nBest regards,\nXiaolei Zhu`,
  };
}
```

- [ ] **Step 7: Verify Task 3**

Run:

```bash
npm run career:test
npm run build
```

Expected: tests PASS; build PASS.

- [ ] **Step 8: Commit Task 3**

```bash
git add src/career/applicationState.js src/career/useApplicationState.js src/career/careerRows.js src/career/__tests__/applicationState.test.mjs src/career/__tests__/careerRows.test.mjs
git commit -m "feat: add local application state helpers"
```

---

### Task 4: Build The Local Career Console UI

**Files:**
- Modify: `src/career/CareerConsole.jsx`
- Create: `src/career/careerData.js`
- Create: `src/career/ApplicationBoard.jsx`
- Create: `src/career/EvidenceReview.jsx`
- Create: `src/career/ApplyPack.jsx`
- Create: `src/career/JdIntakeHelper.jsx`

**Interfaces:**
- Consumes: `deriveCareerRows({ versions, applicationState })`
- Consumes: `useApplicationState()`
- Consumes: `getDefaultApplyDraft(version)`
- Consumes: `loadCareerVersions() => Promise<Array>`
- Produces: visible local `/career` workflow with board, evidence, apply pack, and intake helper.

- [ ] **Step 1: Add runtime local data loader**

Create `src/career/careerData.js`:

```js
export async function loadCareerVersions() {
  const response = await fetch('/src/data/career-versions.local.json', { cache: 'no-store' });
  if (!response.ok) {
    return [];
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}
```

This file intentionally fetches the ignored JSON at runtime instead of importing it. The public build may include this loader code, but it must not bundle the private JSON file.

- [ ] **Step 2: Replace placeholder `CareerConsole.jsx`**

Implement `src/career/CareerConsole.jsx`:

```jsx
import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, FileText, Send, ShieldCheck } from 'lucide-react';
import { loadCareerVersions } from './careerData';
import { deriveCareerRows } from './careerRows';
import { useApplicationState } from './useApplicationState';
import ApplicationBoard from './ApplicationBoard';
import EvidenceReview from './EvidenceReview';
import ApplyPack from './ApplyPack';
import JdIntakeHelper from './JdIntakeHelper';

export default function CareerConsole() {
  const { applicationState, updateRecord } = useApplicationState();
  const [careerVersions, setCareerVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    loadCareerVersions().then((versions) => {
      if (active) {
        setCareerVersions(versions);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);
  const rows = useMemo(() => deriveCareerRows({ versions: careerVersions, applicationState }), [careerVersions, applicationState]);
  const [selectedSlug, setSelectedSlug] = useState(rows[0]?.slug || '');
  const selected = rows.find((row) => row.slug === selectedSlug) || rows[0];

  useEffect(() => {
    if (!selectedSlug && rows[0]?.slug) {
      setSelectedSlug(rows[0].slug);
    }
  }, [rows, selectedSlug]);

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="mb-6">
          <p className="text-sm font-medium text-teal-700 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Local-only workspace</p>
          <h1 className="text-3xl font-bold mt-2">Career Console</h1>
          <p className="text-gray-600 mt-2 max-w-3xl">Review tailored resume versions, evidence, and manual application packs before submitting anything yourself.</p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4"><ClipboardList className="w-5 h-5 text-teal-700 mb-2" /><div className="text-2xl font-semibold">{rows.length}</div><div className="text-sm text-gray-600">Generated versions</div></div>
          <div className="bg-white border border-gray-200 rounded-lg p-4"><FileText className="w-5 h-5 text-teal-700 mb-2" /><div className="text-2xl font-semibold">{rows.filter((row) => row.hasPdf).length}</div><div className="text-sm text-gray-600">PDF ready</div></div>
          <div className="bg-white border border-gray-200 rounded-lg p-4"><Send className="w-5 h-5 text-teal-700 mb-2" /><div className="text-2xl font-semibold">{rows.filter((row) => row.status === 'applied').length}</div><div className="text-sm text-gray-600">Applied</div></div>
          <div className="bg-white border border-gray-200 rounded-lg p-4"><ShieldCheck className="w-5 h-5 text-teal-700 mb-2" /><div className="text-2xl font-semibold">Manual</div><div className="text-sm text-gray-600">Submit gate</div></div>
        </section>

        {loading || rows.length === 0 ? (
          <JdIntakeHelper />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(320px,420px)_1fr] gap-6">
            <ApplicationBoard rows={rows} selectedSlug={selected?.slug} onSelect={setSelectedSlug} onUpdate={updateRecord} />
            <div className="space-y-6">
              <EvidenceReview version={selected} />
              <ApplyPack version={selected} onUpdate={updateRecord} />
              <JdIntakeHelper selectedSlug={selected?.slug} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Implement `ApplicationBoard.jsx`**

Create `src/career/ApplicationBoard.jsx`:

```jsx
const STATUSES = ['generated', 'reviewing', 'ready_to_apply', 'applied', 'follow_up', 'closed'];

export default function ApplicationBoard({ rows, selectedSlug, onSelect, onUpdate }) {
  return (
    <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">Application Board</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {rows.map((row) => (
          <article key={row.slug} className={`p-4 ${selectedSlug === row.slug ? 'bg-teal-50' : 'bg-white'}`}>
            <button className="text-left w-full" onClick={() => onSelect(row.slug)}>
              <h3 className="font-semibold text-gray-900">{row.label}</h3>
              <p className="text-sm text-gray-600 mt-1">{row.archetype}</p>
              <p className="text-xs text-gray-500 mt-2">{row.nextAction}</p>
            </button>
            <div className="mt-3 flex items-center gap-2">
              <select
                className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                value={row.status}
                onChange={(event) => onUpdate(row.slug, { status: event.target.value })}
              >
                {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
              {row.pdfPath ? <a className="text-sm text-teal-700 hover:underline" href={row.pdfPath}>PDF</a> : <span className="text-sm text-amber-700">PDF missing</span>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Implement `EvidenceReview.jsx`**

Create `src/career/EvidenceReview.jsx`:

```jsx
import { marked } from 'marked';

export default function EvidenceReview({ version }) {
  if (!version) return null;
  const html = marked.parse(version.evaluationMarkdown || 'No evaluation generated yet.');
  const warnings = version.metadata?.truthWarnings || [];
  const keywords = version.metadata?.keywords || [];

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-5">
      <h2 className="text-lg font-semibold">Evidence Review</h2>
      <div className="flex flex-wrap gap-2 mt-3">
        {keywords.slice(0, 12).map((keyword) => <span key={keyword} className="text-xs px-2 py-1 rounded border border-teal-200 bg-teal-50 text-teal-800">{keyword}</span>)}
      </div>
      {warnings.length > 0 && (
        <div className="mt-4 border border-amber-200 bg-amber-50 rounded-md p-3">
          <h3 className="font-medium text-amber-900">Truth warnings</h3>
          <ul className="mt-2 list-disc list-inside text-sm text-amber-900">
            {warnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </div>
      )}
      <div className="prose prose-sm max-w-none mt-4" dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  );
}
```

- [ ] **Step 5: Implement `ApplyPack.jsx`**

Create `src/career/ApplyPack.jsx`:

```jsx
import { useMemo } from 'react';
import { getDefaultApplyDraft } from './careerRows';

export default function ApplyPack({ version, onUpdate }) {
  const draft = useMemo(() => getDefaultApplyDraft(version), [version]);
  if (!version) return null;

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-5">
      <h2 className="text-lg font-semibold">Manual Apply Pack</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <label className="block">
          <span className="text-sm font-medium">Application URL</span>
          <input className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2" value={version.applicationUrl || ''} onChange={(event) => onUpdate(version.slug, { applicationUrl: event.target.value })} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Notes</span>
          <input className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2" value={version.notes || ''} onChange={(event) => onUpdate(version.slug, { notes: event.target.value })} />
        </label>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3">
        <textarea className="w-full min-h-24 border border-gray-300 rounded-md p-3 text-sm" readOnly value={draft.hrMessage} />
        <textarea className="w-full min-h-24 border border-gray-300 rounded-md p-3 text-sm" readOnly value={draft.linkedInMessage} />
        <textarea className="w-full min-h-36 border border-gray-300 rounded-md p-3 text-sm" readOnly value={draft.emailBody} />
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Implement `JdIntakeHelper.jsx`**

Create `src/career/JdIntakeHelper.jsx`:

```jsx
export default function JdIntakeHelper({ selectedSlug = 'new-role-slug' }) {
  const slug = selectedSlug || 'new-role-slug';
  const commands = [
    `npm run resume:adapt -- --jd career/jds/${slug}.md --slug ${slug}`,
    `npm run resume:pdf -- --slug ${slug}`,
    'npm run resume:manifest',
  ];

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-5">
      <h2 className="text-lg font-semibold">JD Intake Helper</h2>
      <p className="text-sm text-gray-600 mt-2">Save the JD as <code>career/jds/{slug}.md</code>, then run:</p>
      <pre className="mt-3 bg-gray-900 text-gray-100 rounded-md p-4 overflow-x-auto text-sm">{commands.join('\n')}</pre>
    </section>
  );
}
```

- [ ] **Step 7: Verify Task 4**

Run:

```bash
npm run career:test
npm run resume:manifest
VITE_ENABLE_CAREER_CONSOLE=true npm run build
npm run build
```

Expected: tests PASS; both builds PASS. Neither build should statically import `career-versions.local.json`.

- [ ] **Step 8: Manual UI check**

Run:

```bash
VITE_ENABLE_CAREER_CONSOLE=true npm run dev -- --host 127.0.0.1
```

Open `/career`. Verify:
- board shows at least the sample generated role
- selecting a row updates the detail panels
- status, URL, and notes persist after refresh
- PDF link opens the generated PDF
- root `/` still shows the original resume layout

- [ ] **Step 9: Commit Task 4**

```bash
git add src/career/CareerConsole.jsx src/career/careerData.js src/career/ApplicationBoard.jsx src/career/EvidenceReview.jsx src/career/ApplyPack.jsx src/career/JdIntakeHelper.jsx src/data/resume-versions.json
git commit -m "feat: add local career console UI"
```

---

### Task 5: Tighten Privacy, Documentation, And Final Verification

**Files:**
- Modify: `career/README.md`
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-06-24-local-career-console-design.md` only if implementation discovers a necessary clarification

**Interfaces:**
- Consumes: all previous tasks.
- Produces: documented local workflow and verified privacy behavior.

- [ ] **Step 1: Document local usage**

Add to `career/README.md`:

~~~md
## Local Career Console

The `/career` console is local-only. Start it with:

```bash
VITE_ENABLE_CAREER_CONSOLE=true npm run dev -- --host 127.0.0.1
```

Use the console to review generated versions, truth warnings, evidence gaps, manual application messages, application URLs, and follow-up notes. Do not treat it as an automated submission tool.

The detailed local career manifest is generated at `src/data/career-versions.local.json` and is ignored by git. The public `src/data/resume-versions.json` must not include truth warnings or evaluation markdown.
~~~

- [ ] **Step 2: Document public build privacy in root README**

Add a short section:

```md
## Privacy Boundary

The public resume site defaults to the resume page. The local `/career` application console is disabled unless `VITE_ENABLE_CAREER_CONSOLE=true` is set for development. Keep JD text, truth warnings, and application notes out of public build artifacts.
```

- [ ] **Step 3: Run full verification**

Run:

```bash
npm run resume:test
npm run career:test
npm run resume:manifest
npm run build
VITE_ENABLE_CAREER_CONSOLE=true npm run build
git diff --check
```

Expected: all commands PASS.

- [ ] **Step 4: Inspect public manifest for private fields**

Run:

```bash
node -e "const versions=require('./src/data/resume-versions.json'); const text=JSON.stringify(versions); if (/truthWarnings|evaluationMarkdown|Do not claim/.test(text)) process.exit(1); console.log('public manifest clean')"
```

Expected: prints `public manifest clean`.

- [ ] **Step 5: Inspect ignored local manifest presence**

Run:

```bash
git status --short --ignored src/data/career-versions.local.json
```

Expected: shows `!! src/data/career-versions.local.json` when generated.

- [ ] **Step 6: Commit Task 5**

```bash
git add README.md career/README.md
git commit -m "docs: document local career console workflow"
```

---

## Plan Self-Review

Spec coverage:
- Local `/career` route: Task 1 and Task 4.
- Production disabled and no private bundling by default: Task 1, Task 2, Task 5.
- Application board statuses: Task 3 and Task 4.
- Evidence review with truth warnings: Task 2 and Task 4.
- Manual apply pack: Task 3 and Task 4.
- JD intake helper without browser file writes: Task 4.
- No auto crawling/submit/auth: Global Constraints and Task 5 documentation.

Placeholder scan:
- No unfinished placeholder markers remain in this plan.
- Each task has exact files, interfaces, commands, and expected outcomes.

Type consistency:
- `isCareerConsoleEnabled`, `deriveCareerRows`, `getDefaultApplyDraft`, `readApplicationState`, `writeApplicationState`, and `updateApplicationRecord` signatures are used consistently across tasks.
- Status values match the design spec.
