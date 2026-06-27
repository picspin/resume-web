# Career WYSIWYG Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local-only WYSIWYG Career Console where draft projects and JD context can be previewed inside the actual web resume layout before any manual apply/publish step.

**Architecture:** Keep `/career` behind the existing dev-only gate. Build a pure preview merge helper, then wire Portfolio Studio drafts into an in-memory resume preview rendered with the public `ResumeSection` component. Replace command-only JD intake copy with a visual workflow that still copies commands rather than writing files or running shell commands.

**Tech Stack:** React 18, Vite 6, lucide-react, existing `node:test` + esbuild JSX test harness, existing resume JSON data and resume-ops npm scripts.

## Global Constraints

- `/career` remains gated by local dev mode and `VITE_ENABLE_CAREER_CONSOLE=true`.
- Default production builds must not include WYSIWYG console markers, local storage keys, command strings, JD workflow copy, or Portfolio Studio implementation strings.
- Generated project descriptions remain HTML-escaped before being sent to preview payloads because the public resume project renderer currently uses `dangerouslySetInnerHTML`.
- JD text and project evidence may persist only in browser `localStorage` for local convenience. The UI must offer a clear action.
- No browser-side file writes to `career/jds/*.md`.
- No automatic mutation of `src/data/resume-en.json` or `src/data/resume-zh.json`.
- No external LLM API calls.
- No automatic shell command execution from the browser.
- No automated job application submission.

---

## File Structure

- Create `src/career/portfolioPreview.js`: pure helpers for merging a Portfolio Studio draft into a cloned resume object.
- Create `src/career/__tests__/portfolioPreview.test.mjs`: unit tests for immutable preview behavior.
- Create `src/career/CareerEntry.jsx`: local-only homepage navigation button.
- Modify `src/App.jsx`: render `CareerEntry` only in local dev career mode.
- Modify `src/career/__tests__/careerConsoleComponents.test.mjs`: JSX tests for Career Entry, Resume Preview, and JD Workflow entry points.
- Modify `src/career/__tests__/careerBuildPrivacy.test.mjs`: add WYSIWYG and JD workflow markers to default production forbidden strings.
- Modify `src/career/PortfolioStudio.jsx`: accept `onDraftChange`, notify parent after generate/clear, and add a preview button label.
- Create `src/career/ResumePreview.jsx`: local preview panel using `ResumeSection`.
- Modify `src/career/CareerConsole.jsx`: import base resume data, hold current draft state, render `ResumePreview`, replace hard error empty state copy.
- Modify `src/career/JdIntakeHelper.jsx`: convert to visual JD workflow with slug generation, JD text input, path/command previews, and copy actions.
- Modify `career/README.md`: document WYSIWYG preview and visual JD workflow boundaries.

---

### Task 1: Pure Resume Preview Merge

**Files:**
- Create: `src/career/portfolioPreview.js`
- Create: `src/career/__tests__/portfolioPreview.test.mjs`

**Interfaces:**
- Consumes: draft objects from `buildPortfolioDraft(input)` in `src/career/portfolioDrafts.js`.
- Produces: `buildResumePreview(baseResume, draft)` returning `{ resume, metadata }`.
- Produces: `appendUniqueSkills(baseSkills, nextSkills)` returning a string array.

- [ ] **Step 1: Write failing tests for immutable preview merge**

Create `src/career/__tests__/portfolioPreview.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPortfolioDraft } from '../portfolioDrafts.js'
import { appendUniqueSkills, buildResumePreview } from '../portfolioPreview.js'

test('buildResumePreview appends draft project and unique skills without mutating base resume', () => {
  const baseResume = {
    general: { name: 'Xiaolei Zhu' },
    skills: ['Medical AI & Digital Health: LLM/RAG workflow design.'],
    projects: [{ projectNumber: 1, title: 'Existing Project', description: 'Existing', image: '/images/projects/project-1.jpg' }],
  }
  const draft = buildPortfolioDraft({
    title: 'Radiology RAG Enablement',
    projectType: 'llm-rag',
    role: 'Solution owner',
    dateRange: '2025',
    imagePath: '/images/projects/project-24.jpg',
    rawText: 'Designed a RAG-based assistant for radiology product education.',
  })

  const preview = buildResumePreview(baseResume, draft)

  assert.equal(baseResume.projects.length, 1)
  assert.equal(preview.resume.projects.length, 2)
  assert.equal(preview.resume.projects[1].title, 'Radiology RAG Enablement')
  assert.ok(preview.resume.skills.length > baseResume.skills.length)
  assert.deepEqual(preview.metadata.resumeBullets, [draft.resumeBullet])
  assert.equal(preview.metadata.reviewOnly, true)
})

test('buildResumePreview returns a safe clone when draft is empty', () => {
  const baseResume = { general: { name: 'Xiaolei Zhu' }, skills: ['A'], projects: [] }
  const preview = buildResumePreview(baseResume, null)

  assert.notEqual(preview.resume, baseResume)
  assert.deepEqual(preview.resume, baseResume)
  assert.deepEqual(preview.metadata.resumeBullets, [])
})

test('appendUniqueSkills keeps order and removes duplicates', () => {
  assert.deepEqual(
    appendUniqueSkills(['A', 'B'], ['B', 'C', '', 'A']),
    ['A', 'B', 'C'],
  )
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test src/career/__tests__/portfolioPreview.test.mjs`

Expected: FAIL with module-not-found for `../portfolioPreview.js`.

- [ ] **Step 3: Implement preview helper**

Create `src/career/portfolioPreview.js`:

```js
function cloneResume(baseResume = {}) {
  return JSON.parse(JSON.stringify(baseResume || {}))
}

export function appendUniqueSkills(baseSkills = [], nextSkills = []) {
  const seen = new Set()
  return [...baseSkills, ...nextSkills]
    .filter((skill) => typeof skill === 'string' && skill.trim())
    .filter((skill) => {
      const key = skill.trim()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export function buildResumePreview(baseResume = {}, draft = null) {
  const resume = cloneResume(baseResume)
  const metadata = {
    resumeBullets: [],
    warnings: [],
    reviewOnly: Boolean(draft),
  }

  if (!Array.isArray(resume.skills)) resume.skills = []
  if (!Array.isArray(resume.projects)) resume.projects = []

  if (!draft?.webProject) {
    return { resume, metadata }
  }

  const nextSkills = Array.isArray(draft.jsonPatch?.skills) ? draft.jsonPatch.skills : []
  resume.projects = [...resume.projects, draft.webProject]
  resume.skills = appendUniqueSkills(resume.skills, nextSkills)
  metadata.resumeBullets = Array.isArray(draft.jsonPatch?.resumeBullets) ? draft.jsonPatch.resumeBullets : []
  metadata.warnings = Array.isArray(draft.warnings) ? draft.warnings : []

  return { resume, metadata }
}
```

- [ ] **Step 4: Run tests to verify green**

Run: `node --test src/career/__tests__/portfolioPreview.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/career/portfolioPreview.js src/career/__tests__/portfolioPreview.test.mjs
git commit -m "feat: add resume preview merge helper"
```

---

### Task 2: Local Homepage Entry To Career Console

**Files:**
- Create: `src/career/CareerEntry.jsx`
- Modify: `src/App.jsx`
- Modify: `src/career/__tests__/careerConsoleComponents.test.mjs`
- Modify: `src/career/__tests__/careerBuildPrivacy.test.mjs`

**Interfaces:**
- Consumes: existing `isCareerConsoleEnabled({ env, pathname })`.
- Produces: `CareerEntry` React component with an `<a href="/career">` control.

- [ ] **Step 1: Write failing JSX test for local Career Entry**

Append to `src/career/__tests__/careerConsoleComponents.test.mjs`:

```js
test('CareerEntry links the local homepage to the Career Console', async () => {
  const { default: CareerEntry } = await importJsxModule('src/career/CareerEntry.jsx')
  const tree = CareerEntry()
  const links = findElements(tree, (node) => node.type === 'a')

  assert.equal(links.length, 1)
  assert.equal(links[0].props.href, '/career')
  assert.match(String(links[0].props.children), /Career Console/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run career:test`

Expected: FAIL because `src/career/CareerEntry.jsx` does not exist.

- [ ] **Step 3: Create `CareerEntry`**

Create `src/career/CareerEntry.jsx`:

```jsx
import { BriefcaseBusiness } from 'lucide-react'

export default function CareerEntry() {
  return (
    <a
      href="/career"
      className="btn-secondary inline-flex items-center gap-1"
      title="Open local Career Console"
    >
      <BriefcaseBusiness className="h-4 w-4" />
      Career Console
    </a>
  )
}
```

- [ ] **Step 4: Render entry from `App.jsx` only when local console is enabled**

Modify `src/App.jsx`:

```jsx
const CareerEntry = import.meta.env.DEV ? lazy(() => import('./career/CareerEntry')) : null
```

Inside the returned header controls area, after `<Header ... />`, render:

```jsx
{careerEnabled && CareerEntry && (
  <div className="mb-6 flex justify-end">
    <Suspense fallback={null}>
      <CareerEntry />
    </Suspense>
  </div>
)}
```

Keep the existing `/career` route behavior unchanged.

- [ ] **Step 5: Strengthen production privacy markers**

Add these strings to `forbiddenMarkers` in `src/career/__tests__/careerBuildPrivacy.test.mjs`:

```js
'Open local Career Console',
'BriefcaseBusiness',
```

- [ ] **Step 6: Run tests**

Run: `npm run career:test`

Expected: PASS.

- [ ] **Step 7: Commit Task 2**

```bash
git add src/App.jsx src/career/CareerEntry.jsx src/career/__tests__/careerConsoleComponents.test.mjs src/career/__tests__/careerBuildPrivacy.test.mjs
git commit -m "feat: add local career console entry"
```

---

### Task 3: Portfolio Draft To Resume Preview

**Files:**
- Create: `src/career/ResumePreview.jsx`
- Modify: `src/career/PortfolioStudio.jsx`
- Modify: `src/career/CareerConsole.jsx`
- Modify: `src/career/__tests__/careerConsoleComponents.test.mjs`
- Modify: `src/career/__tests__/careerBuildPrivacy.test.mjs`

**Interfaces:**
- Consumes: `buildResumePreview(baseResume, draft)` from Task 1.
- Consumes: `resumeEn` from `src/data/resume-en.json`.
- Produces: `PortfolioStudio({ onDraftChange })`.
- Produces: `ResumePreview({ preview })`.

- [ ] **Step 1: Write failing tests for preview component and console entry**

Append to `src/career/__tests__/careerConsoleComponents.test.mjs`:

```js
test('ResumePreview renders draft bullets and resume layout sections', async () => {
  const { default: ResumePreview } = await importJsxModule('src/career/ResumePreview.jsx')
  const preview = {
    resume: {
      education: [],
      work: [],
      skills: ['Medical AI & Digital Health: LLM/RAG workflow design.'],
      certificates: [],
      projects: [{ title: 'Radiology RAG Enablement', description: 'Solution owner.', image: '/images/projects/project-1.jpg' }],
      publications: [],
      posters: [],
      patents: [],
    },
    metadata: {
      resumeBullets: ['Radiology RAG Enablement: Solution owner.'],
      warnings: [],
      reviewOnly: true,
    },
  }
  const html = renderToStaticMarkup(React.createElement(ResumePreview, { preview }))

  assert.match(html, /Resume Preview/)
  assert.match(html, /Radiology RAG Enablement/)
  assert.match(html, /Draft bullets/)
})

test('CareerConsole renders the resume preview workspace', async () => {
  const { default: CareerConsole } = await importJsxModule('src/career/CareerConsole.jsx')
  const html = renderToStaticMarkup(React.createElement(CareerConsole))

  assert.match(html, /Resume Preview/)
  assert.match(html, /Generate a portfolio draft to preview it in the live resume layout/)
})
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run career:test`

Expected: FAIL because `ResumePreview.jsx` does not exist.

- [ ] **Step 3: Create `ResumePreview.jsx`**

Create `src/career/ResumePreview.jsx`:

```jsx
import ResumeSection from '../components/ResumeSection'

export default function ResumePreview({ preview }) {
  if (!preview?.resume) {
    return (
      <section className="rounded-lg border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-600">
        Generate a portfolio draft to preview it in the live resume layout.
      </section>
    )
  }

  const bullets = preview.metadata?.resumeBullets || []
  const warnings = preview.metadata?.warnings || []

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="mb-5">
        <p className="text-sm font-medium text-teal-700">Resume Preview</p>
        <h2 className="mt-1 text-xl font-semibold">Live web layout preview</h2>
        <p className="mt-2 text-sm text-gray-600">
          This is an in-memory preview only. Source resume files are unchanged.
        </p>
      </div>

      {warnings.length > 0 && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {warnings.map((warning) => <p key={warning}>{warning}</p>)}
        </div>
      )}

      {bullets.length > 0 && (
        <div className="mb-6 rounded-md bg-gray-50 p-4">
          <h3 className="text-sm font-semibold text-gray-800">Draft bullets</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
            {bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
          </ul>
        </div>
      )}

      <div className="rounded-md border border-gray-100 bg-gray-50 p-4">
        <ResumeSection data={preview.resume} />
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Add draft change callback to `PortfolioStudio.jsx`**

Change function signature:

```jsx
export default function PortfolioStudio({ onDraftChange = () => {} }) {
```

Inside `useEffect`, after loading saved draft:

```jsx
if (saved?.draft) {
  setDraft(saved.draft)
  onDraftChange(saved.draft)
}
```

Inside `generateDraft`, after `setDraft(nextDraft)`:

```jsx
onDraftChange(nextDraft)
```

Inside `resetDraft`, after `setDraft(null)`:

```jsx
onDraftChange(null)
```

- [ ] **Step 5: Wire preview in `CareerConsole.jsx`**

Modify imports:

```jsx
import resumeEn from '../data/resume-en.json'
import { buildResumePreview } from './portfolioPreview'
import ResumePreview from './ResumePreview'
```

Add state:

```jsx
const [portfolioDraft, setPortfolioDraft] = useState(null)
const resumePreview = useMemo(
  () => buildResumePreview(resumeEn, portfolioDraft),
  [portfolioDraft],
)
```

Change:

```jsx
<PortfolioStudio />
```

to:

```jsx
<PortfolioStudio onDraftChange={setPortfolioDraft} />
```

Render after `PortfolioStudio`:

```jsx
<div className="mb-6">
  <ResumePreview preview={portfolioDraft ? resumePreview : null} />
</div>
```

- [ ] **Step 6: Update production privacy markers**

Add to `forbiddenMarkers`:

```js
'Resume Preview',
'Live web layout preview',
'Draft bullets',
'Generate a portfolio draft to preview it in the live resume layout',
```

- [ ] **Step 7: Run tests**

Run: `npm run career:test`

Expected: PASS.

- [ ] **Step 8: Commit Task 3**

```bash
git add src/career/ResumePreview.jsx src/career/PortfolioStudio.jsx src/career/CareerConsole.jsx src/career/__tests__/careerConsoleComponents.test.mjs src/career/__tests__/careerBuildPrivacy.test.mjs
git commit -m "feat: preview portfolio drafts in resume layout"
```

---

### Task 4: Visual JD Workflow

**Files:**
- Modify: `src/career/JdIntakeHelper.jsx`
- Modify: `src/career/CareerConsole.jsx`
- Modify: `src/career/__tests__/careerConsoleComponents.test.mjs`
- Modify: `src/career/__tests__/careerBuildPrivacy.test.mjs`

**Interfaces:**
- Produces: existing default export `JdIntakeHelper({ selectedSlug })`.
- Produces visual fields and copyable command text; does not write files or execute commands.

- [ ] **Step 1: Write failing JD workflow tests**

Append to `src/career/__tests__/careerConsoleComponents.test.mjs`:

```js
test('JdIntakeHelper renders a visual JD workflow with generated commands', async () => {
  const { default: JdIntakeHelper } = await importJsxModule('src/career/JdIntakeHelper.jsx')
  const html = renderToStaticMarkup(React.createElement(JdIntakeHelper, { selectedSlug: 'medical-ai-lead' }))

  assert.match(html, /JD Workflow/)
  assert.match(html, /career\/jds\/medical-ai-lead.md/)
  assert.match(html, /npm run resume:adapt -- --jd career\/jds\/medical-ai-lead.md --slug medical-ai-lead/)
  assert.match(html, /Manual command step/)
})
```

Update the existing Career Console test expectation for empty state:

```js
assert.match(html, /No tailored resume versions loaded yet/i)
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run career:test`

Expected: FAIL because existing helper title/copy is `JD Intake Helper`.

- [ ] **Step 3: Implement visual helper**

Replace `src/career/JdIntakeHelper.jsx` with:

```jsx
import { useMemo, useState } from 'react'
import { CheckCircle2, Copy } from 'lucide-react'

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'new-role-slug'
}

async function copyToClipboard(text) {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return false
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export default function JdIntakeHelper({ selectedSlug = 'new-role-slug' }) {
  const [roleTitle, setRoleTitle] = useState(selectedSlug)
  const [company, setCompany] = useState('')
  const [jdText, setJdText] = useState('')
  const [copied, setCopied] = useState('')
  const slug = useMemo(() => slugify([company, roleTitle].filter(Boolean).join(' ')), [company, roleTitle])
  const jdPath = `career/jds/${slug}.md`
  const commands = [
    `npm run resume:adapt -- --jd ${jdPath} --slug ${slug}`,
    `npm run resume:pdf -- --slug ${slug}`,
    'npm run resume:manifest',
  ]

  const copyText = async (label, text) => {
    const ok = await copyToClipboard(text)
    setCopied(ok ? `${label} copied` : 'Clipboard unavailable')
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-teal-700">JD Workflow</p>
          <h2 className="mt-1 text-lg font-semibold">Prepare a local tailored resume version</h2>
          <p className="mt-2 text-sm text-gray-600">
            Build the JD file path and commands visually. File save and command execution remain manual in this MVP.
          </p>
        </div>
        <button
          type="button"
          onClick={() => copyText('Commands', commands.join('\n'))}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Copy className="h-4 w-4" />
          Copy commands
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block text-sm font-medium text-gray-700">
          Company
          <input value={company} onChange={(event) => setCompany(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="Varian" />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Role title
          <input value={roleTitle} onChange={(event) => setRoleTitle(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="Medical AI Product Lead" />
        </label>
      </div>

      <label className="mt-4 block text-sm font-medium text-gray-700">
        JD text
        <textarea value={jdText} onChange={(event) => setJdText(event.target.value)} rows={5} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="Paste the JD here for local drafting context." />
      </label>

      <div className="mt-4 rounded-md bg-gray-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <code className="text-sm text-gray-800">{jdPath}</code>
          <button type="button" onClick={() => copyText('JD path', jdPath)} className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-white">
            <Copy className="h-4 w-4" />
            Copy path
          </button>
        </div>
        <ol className="mt-4 space-y-2 text-sm text-gray-700">
          {commands.map((command) => (
            <li key={command} className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
              <span><span className="font-medium">Manual command step:</span> <code>{command}</code></span>
            </li>
          ))}
        </ol>
      </div>

      {jdText && <p className="mt-3 text-xs text-gray-500">{jdText.length} JD characters held locally in this browser session.</p>}
      {copied && <p className="mt-3 text-xs text-gray-500">{copied}</p>}
    </section>
  )
}
```

- [ ] **Step 4: Soften empty career version state**

In `src/career/CareerConsole.jsx`, replace empty-state text block with:

```jsx
{loadError ? 'No tailored resume versions loaded yet. Use the JD Workflow below to prepare one, or generate a Portfolio Studio draft for preview.' : 'No tailored resume versions loaded yet. Generate a local version when you are ready to create a PDF/application pack.'}
```

- [ ] **Step 5: Update production privacy markers**

Add to `forbiddenMarkers`:

```js
'JD Workflow',
'Manual command step',
'career/jds/',
'npm run resume:adapt',
```

- [ ] **Step 6: Run tests**

Run: `npm run career:test`

Expected: PASS.

- [ ] **Step 7: Commit Task 4**

```bash
git add src/career/JdIntakeHelper.jsx src/career/CareerConsole.jsx src/career/__tests__/careerConsoleComponents.test.mjs src/career/__tests__/careerBuildPrivacy.test.mjs
git commit -m "feat: add visual jd workflow"
```

---

### Task 5: Documentation And Full Verification

**Files:**
- Modify: `career/README.md`
- Modify: `docs/superpowers/plans/2026-06-27-career-wysiwyg-implementation.md` as checklist items are completed.

**Interfaces:**
- Consumes implemented UI from Tasks 1-4.
- Produces updated local usage docs and verified branch state.

- [ ] **Step 1: Update README**

In `career/README.md`, add a `WYSIWYG Preview` subsection under Portfolio Studio:

```md
### WYSIWYG Preview

When `VITE_ENABLE_CAREER_CONSOLE=true` is set in local dev, the homepage shows a `Career Console` entry. Inside `/career`, Portfolio Studio can generate an in-memory resume preview that renders through the same web resume layout used by `picspin.github.io`.

This preview is not a publish action. It does not write `src/data/resume-en.json`, does not write `src/data/resume-zh.json`, does not save JD files, and does not run shell commands. Use the visual JD Workflow to prepare the target `career/jds/<slug>.md` path and copy the existing resume-ops commands when you are ready to generate PDFs and manifests.
```

- [ ] **Step 2: Run full verification**

Run:

```bash
npm run lint
npm run career:test
npm run build
```

Expected:

- `npm run lint`: exit 0.
- `npm run career:test`: all tests pass.
- `npm run build`: exit 0; default production build does not expose `/career` implementation details.

- [ ] **Step 3: Browser smoke check**

Start server if needed:

```bash
VITE_ENABLE_CAREER_CONSOLE=true npm run dev -- --host 127.0.0.1 --port 5173
```

Run a Playwright smoke check that confirms:

- `http://127.0.0.1:5173/` includes `Career Console`.
- `http://127.0.0.1:5173/career` includes `Portfolio Studio`, `Resume Preview`, `JD Workflow`, and `Generate draft`.

- [ ] **Step 4: Commit docs**

```bash
git add career/README.md docs/superpowers/plans/2026-06-27-career-wysiwyg-implementation.md
git commit -m "docs: document career wysiwyg workflow"
```

- [ ] **Step 5: Final branch review and push**

Run:

```bash
git status --short --branch
git log --oneline -5
git push
```

Expected: clean worktree after push, existing PR updated.
