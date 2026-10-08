# Xiaolei Zhu - Professional Resume

This repository contains two connected tools:

- A public React/Vite resume website for Xiaolei Zhu.
- A local medical/pharma resume-ops workspace for tailoring resumes to specific JDs, generating PDFs, and reviewing application materials before manual submission.

## Features

- Dark/light mode toggle.
- English/Chinese resume content.
- Responsive public resume layout.
- Structured skills, projects, publications, patents, and PDF download support.
- JD-specific medical/pharma resume adaptation workflow.
- Main resume page edit mode for module-level WYSIWYG review while preserving the public layout.
- Local-only `/career` Career-Ops center organized around New Job, Opportunities, Jobs, Agent Runs, and Interview workflows.

## Tech Stack

- **Frontend:** React 18
- **Build tool:** Vite
- **Styling:** Tailwind CSS v4
- **Icons:** Lucide React
- **Resume ops:** Node ESM scripts, `node:test`, Playwright PDF rendering

## Quick Start

Use Node.js 22.13 or newer. CI and deployment use Node.js 24.

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the public resume site:
   ```bash
   npm run dev
   ```

3. Open the local Vite URL, usually:
   ```text
   http://127.0.0.1:3000/
   ```

4. Build for production:
   ```bash
   npm run build
   ```

5. Run the main verification commands:
   ```bash
   npm run lint
   npm run resume:test
   npm run career:test
   npm run build
   ```

## Local Resume Library

Run `npm run dev` and open the displayed local URL. The initial resume is a
sample, not a shared master for every document.

1. Choose **Blank**, an English/Chinese **Sample**, or **Duplicate resume**.
2. Turn on **Edit mode**. Select profile text, photos, or a section to edit its
   dedicated drawer. Entries support adding, copying, deleting, and reordering.
3. Choose a theme and use **Save**. Documents are stored in this browser's local
   storage; unsaved edits are not shared with Career-Ops. Storage errors remain
   visible instead of claiming success.
4. Use **Versions** to save a named snapshot. Restoring creates a new document.
5. **PDF** prints the current document with editing controls hidden and scrolling
   content expanded. Choose Save as PDF in the browser print dialog.
6. Open **Career-Ops**, select a saved **Source resume**, and enter a JD. A result
   imports as an independent document. **Open in editor** selects it explicitly;
   changing JD inputs clears the previous result actions.
7. **Sync** prepares a GitHub preview using local `gh` authentication. Inspect the
   repository, visibility, changed paths, and rendered content before **Publish**.
   Only the original personal sample defaults to `picspin/meinCV`; other documents
   require an explicit target. New repositories default to private. Hidden
   sections and internal notes are excluded; visible contact details are included.

Sync publishes a standalone HTML/JSON snapshot, not the full local application,
and does not enable GitHub Pages. Source/target edits or remote branch changes
require another preview. External image URLs must be replaced with uploaded or
local approved images before publishing. Clearing browser storage removes local
documents and versions; GitHub publication is not automatic backup.

## Common Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the public resume development server. |
| `npm run build` | Build the public resume site into `dist/`. |
| `npm run preview` | Preview the built site locally. |
| `npm run format` | Format staged text files with the local no-dependency formatter. |
| `npm run format:check` | Check staged text files for formatting changes. |
| `npm run lint` | Run ESLint. |
| `npm run hooks:install` | Enable the tracked `.githooks/pre-commit` hook for this repository. |
| `npm run resume:test` | Run resume-ops unit tests. |
| `npm run career:test` | Run local career console tests. |
| `npm run resume:sync` | Sync current web resume data into `career/data/master-resume.json`. |
| `npm run resume:adapt -- --jd <jd.md> --slug <slug>` | Generate a tailored resume version from a JD. |
| `npm run resume:pdf -- --slug <slug>` | Render a tailored resume PDF and copy it to public assets. |
| `npm run resume:manifest` | Refresh public and local resume version manifests. |

## Medical Resume-Ops

This project includes a local `career/` workspace for JD-specific medical/pharma resume adaptation and PDF generation. See `career/README.md` for commands.

### Generate a JD-Specific Resume

1. Save a JD as Markdown:
   ```bash
   mkdir -p career/jds
   # Example path:
   # career/jds/medical-ai-product-manager.md
   ```

2. Generate the adapted resume version:
   ```bash
   npm run resume:adapt -- --jd career/jds/medical-ai-product-manager.md --slug medical-ai-product-manager
   ```

   Slugs must use lowercase kebab case, such as `medical-ai-product-manager`.

3. Render the PDF:
   ```bash
   npm run resume:pdf -- --slug medical-ai-product-manager
   ```

4. Refresh manifests for the React app:
   ```bash
   npm run resume:manifest
   ```

Outputs are written to:

- `career/versions/<slug>/resume.json`
- `career/versions/<slug>/metadata.json`
- `career/versions/<slug>/evaluation.md`
- `career/output/cv-<slug>-<date>.pdf`
- `public/generated-resumes/<slug>.pdf`
- `src/data/resume-versions.json` public-safe manifest
- `src/data/career-versions.local.json` local-only manifest, ignored by git

### Use the Local Career Console

The `/career` console is a local Career-Ops workspace. It is disabled in production builds and opens automatically while Vite is running in dev mode.

Start it with:

```bash
npm run dev -- --host 127.0.0.1
```

Then open:

```text
http://127.0.0.1:3000/career
```

Use the console to:

- Start a Job with JD intake, resume adaptation, PDF rendering, Evidence Review, and Manual Apply Pack in one visual workflow.
- Open the optional Portfolio Studio only when a Job needs additional project or skill evidence.
- Review generated Job projects, six-dimension scores, artifacts, and application state in the dedicated Jobs area.
- Inspect persisted workflow runs and events in Agent Runs.
- Keep scanned opportunities separate from full Job workspaces until they are promoted.
- Prepare and retain Job-specific interview practice in the Interview area.
- Inspect archetype fit, extracted keywords, evaluation notes, and truth warnings.
- Prepare a local browser-agent application workflow from a job link with a human confirmation gate.
- Track Job workflow state in the local `career/career-ops.db` SQLite store.
- Store application URLs and follow-up notes on your machine.
- Prepare HR, LinkedIn, and email drafts.

The Application Agent panel models local browser automation for scanning and preparing applications, but it does not bypass login, does not submit final applications, and does not create production user accounts.

### Edit the Main Resume Page

The public resume route is the WYSIWYG surface. In local dev, use the `Edit Mode` toggle on the main resume page:

- OFF keeps the resume as a clean preview.
- ON adds dashed module chrome, hover actions, section ordering handles, and a right-side module editor drawer.
- Work Experience, Projects, and Skills drawers include an AI optimization area for reviewed Studio/Prompt content.
- Local draft saving uses browser storage and does not mutate `src/data/resume-en.json` or `src/data/resume-zh.json`.

### Git Hooks

Install the tracked pre-commit hook once per clone:

```bash
npm run hooks:install
```

The hook formats staged text files, runs ESLint, and runs `npm run career:test`. If formatting changes a staged file, stage the formatted result and commit again.

## Privacy Boundary

The public resume site defaults to the resume page. While running the Vite dev server, the local `/career` console and homepage `Career-Ops` entry are available automatically. Production builds do not expose the local console.

Keep JD text, truth warnings, evaluation markdown, application links, recruiter messages, and follow-up notes out of public build artifacts. `career/career-ops.db`, `career/jobs/`, and `src/data/career-versions.local.json` are local-only and git-ignored. Run `npm run resume:manifest` after local resume generation so `src/data/resume-versions.json` remains public-safe.

Before publishing, verify the public manifest:

```bash
npm run resume:manifest
node -e "const versions=require('./src/data/resume-versions.json'); const text=JSON.stringify(versions); if (/truthWarnings|evaluationMarkdown|jdText|applicationNotes|applicationUrl|Do not claim/.test(text)) process.exit(1); console.log('public manifest clean')"
```

## Project Structure

```text
career/
  config/profile.yml             Medical/pharma positioning and scope
  data/master-resume.json        Source resume evidence for adaptation
  jds/                           Local JD markdown inputs
  modes/                         Resume-ops prompts and evaluation logic
  output/                        Generated local PDFs
  templates/                     PDF/portal templates
  versions/<slug>/               Generated tailored resume records
public/
  generated-resumes/             Public PDF copies
  images/                        Resume images and project thumbnails
scripts/resume-ops/              Local resume adaptation, manifest, and PDF scripts
src/
  career/                        Local-only career console UI and state helpers
  components/                    Public resume UI components
  data/                          Public resume data and public-safe manifests
```

## CI and Deployment

`ci-cd.yml` is the single Pages workflow. PRs to `main`, pushes to `main` or
`develop`, and manual runs use Node 24 and `npm ci` with `package-lock.json`.
CI installs the locked Playwright Chromium with
`npx --no-install playwright install --with-deps chromium`, then requires
`lint`, `resume:test`, `career:test`, and `build` to pass in order.

The JD intake browser test never silently skips when a browser is missing.
Locally run `npx --no-install playwright install chromium`, or explicitly select
an installed browser:

```bash
PLAYWRIGHT_CHROMIUM_CHANNEL=chrome npm run career:test
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/path/to/chromium" npm run career:test
```

The executable path takes precedence over the channel. Without either variable,
the test uses Playwright's bundled Chromium.

Work on a branch, open a PR, and complete review before merging into `main`.
Pushes and PRs validate only. Deployment requires a manual run on `main` with
the `deploy` input enabled. No repository variable is required.
That run validates again and uses the exact validated `dist/` artifact without
rebuilding. Pages write and OIDC permissions
are restricted to the deploy job; the `pages` concurrency group serializes it.

Pages for `picspin/resume-web` is configured to use GitHub Actions. The
`configure-pages` step verifies that configuration before deployment; a manual
dispatch does not bypass token permissions or account restrictions. A successful
test/build run alone does not mean the site has been deployed: check the deploy
job and its reported URL.

Configure Pages to use GitHub Actions and require `Test and Build` plus review
approval in branch protection. Additional deployment approval can be configured
on the `github-pages` environment. These settings must be configured separately;
the workflow alone cannot enforce review approval.

Production is the public static resume only. Local console APIs, SQLite, JD
inputs, and private workflow artifacts stay local. Upload only production
`dist/`, never the workspace or `career/`. Review public PDFs and manifests
before publication. Build implementation owns this public/local boundary.

`resume-web` is private source; `meinCV` is public output. This workflow does not
publish across repositories. Publication to `meinCV` requires a separately
approved, explicitly selected export; do not copy the entire source or blindly
publish `dist/` there. Code PR delivery and Pages activation are separate steps.

A separate required security job gates deployment alongside `Test and Build`:

```bash
npm audit --audit-level moderate
```

Keep dependency updates in `package-lock.json` and avoid publishing local career artifacts.
