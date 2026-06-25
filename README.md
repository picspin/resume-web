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
- Local-only `/career` review console for generated resume versions, evidence, truth warnings, PDFs, application URLs, notes, and manual apply drafts.

## Tech Stack

- **Frontend:** React 18
- **Build tool:** Vite
- **Styling:** Tailwind CSS v4
- **Icons:** Lucide React
- **Resume ops:** Node ESM scripts, `node:test`, Playwright PDF rendering

## Quick Start

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
   http://127.0.0.1:5173/
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

## Common Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the public resume development server. |
| `npm run build` | Build the public resume site into `dist/`. |
| `npm run preview` | Preview the built site locally. |
| `npm run lint` | Run ESLint. |
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

The `/career` console is a local review workspace. It is disabled in production builds and only opens when Vite is running in dev mode with an explicit flag.

Start it with:

```bash
VITE_ENABLE_CAREER_CONSOLE=true npm run dev -- --host 127.0.0.1
```

Then open:

```text
http://127.0.0.1:5173/career
```

Use the console to:

- Review generated resume versions and PDF readiness.
- Inspect archetype fit, extracted keywords, evaluation notes, and truth warnings.
- Track application status locally in `localStorage`.
- Store application URLs and follow-up notes on your machine.
- Prepare manual HR, LinkedIn, and email drafts.

The console does not crawl job boards, does not submit applications, and does not create production user accounts.

## Privacy Boundary

The public resume site defaults to the resume page. The local `/career` console stays disabled unless you are running the Vite dev server and set `VITE_ENABLE_CAREER_CONSOLE=true`.

Keep JD text, truth warnings, evaluation markdown, application links, recruiter messages, and follow-up notes out of public build artifacts. Run `npm run resume:manifest` after local resume generation so `src/data/resume-versions.json` remains public-safe and `src/data/career-versions.local.json` stays local-only and git-ignored.

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

## CI

Pull requests run linting, audit, tests, and production builds through GitHub Actions. The audit gate uses:

```bash
npm audit --audit-level moderate
```

Keep dependency updates in `package-lock.json` and avoid publishing local career artifacts.
