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

## Portfolio Studio

Portfolio Studio lives inside the same local `/career` console. It is for semi-automated project and skills drafting before a human-approved update to the public web resume.

Use it when you have a new GitHub project, medical device/digital health project, or JD-specific evidence that should be considered for `picspin.github.io`:

1. Start the local console:
   ```bash
   VITE_ENABLE_CAREER_CONSOLE=true npm run dev -- --host 127.0.0.1
   ```
2. Open `http://127.0.0.1:5173/career`.
3. In Portfolio Studio, enter the project title, role/date, GitHub URL, image path, concrete project evidence, and optional JD excerpt.
4. Click `Generate draft`.
5. Review the generated web project draft, resume bullet, skill suggestions, AI polish prompt, and review payload.
6. Copy the prompt or review payload only after checking that the claims match real evidence.
7. Use `Clear` when you want to remove the saved Portfolio Studio form and draft from browser local storage.

The MVP intentionally does not call an external AI API, edit `src/data/resume-en.json`, edit `src/data/resume-zh.json`, publish the site, or submit applications. It creates local review material so the final resume and application flow still has a manual approval gate.

Portfolio Studio keeps the last form and draft in browser `localStorage` on the local machine only. This can include JD excerpts and project evidence, so clear it after sensitive drafting sessions.

Project images should stay under `public/images/projects/` and be referenced from the web resume with public paths such as `/images/projects/project-24.jpg`. Use an existing reviewed project image while a new visual asset is still being prepared.
