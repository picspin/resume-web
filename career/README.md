# Medical Resume-Ops

This workspace contains Xiaolei Zhu's medical/pharma resume adaptation system.

## Commands

- `npm run resume:sync` updates `career/data/master-resume.json` from the current Web resume data.
- `npm run resume:adapt -- --jd career/jds/sample-medical-digital-role.md --slug sample-medical-digital-role` generates a tailored resume version.
- `npm run resume:pdf -- --slug sample-medical-digital-role` renders a PDF and copies it to the public site assets.
- `npm run resume:manifest` updates the React version manifest.

## Truth Rules

The system can reframe and reorder existing evidence. It must not invent direct radiation therapy ownership, NMPA registration leadership, CTA/NDA ownership, signed deals, line management, or metrics not present in source evidence.

## Local Career Console

The `/career` console is a local development review surface, not a public feature and not an automated submission tool.

1. Save the JD as `career/jds/<slug>.md`.
2. Generate a tailored version:
   ```bash
   npm run resume:adapt -- --jd career/jds/<slug>.md --slug <slug>
   ```
3. Render the tailored PDF:
   ```bash
   npm run resume:pdf -- --slug <slug>
   ```
4. Refresh the manifests that feed the site:
   ```bash
   npm run resume:manifest
   ```
5. Start the local dev server with the console explicitly enabled:
   ```bash
   VITE_ENABLE_CAREER_CONSOLE=true npm run dev -- --host 127.0.0.1
   ```
6. Open `http://127.0.0.1:5173/career` and review the generated version, truth warnings, evidence gaps, manual application drafts, application URL, and follow-up notes before applying manually.

Important privacy boundary:

- The console only opens when both conditions are true: Vite is running in local dev mode and `VITE_ENABLE_CAREER_CONSOLE=true` (or `1`) is set.
- The detailed local manifest is generated at `src/data/career-versions.local.json`, fetched only from the local dev server, and ignored by git.
- The public manifest is `src/data/resume-versions.json`. It is safe for the public app and must not include truth warnings, evaluation markdown, JD text, or application notes.
- External PDFs are for application materials. Truth warnings remain review-only and should be checked in `/career`, not shared with recruiters or pasted into public artifacts.
