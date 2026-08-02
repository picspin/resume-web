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

The `/career` console is a local Career-Ops center, not a public feature. Its five areas are New Job, Opportunities, Jobs, Agent Runs, and Interview. Resume editing remains on the public resume route.

1. Start the local dev server:
   ```bash
   npm run dev -- --host 127.0.0.1
   ```
2. Open `http://127.0.0.1:3000/career`.
3. In New Job, paste the company, role, source link, and JD, then run the local workflow.
4. Review the score, Evidence Review, and Manual Apply Pack produced for that Job.
5. Use Jobs for existing projects and Agent Runs for persisted workflow history. Neither area duplicates JD intake.

Important privacy boundary:

- The console opens automatically while Vite is running in local dev mode. Production builds do not expose it.
- Job state, workflow runs, artifacts, and approvals are indexed in `career/career-ops.db`. Human-readable Job assets are stored under `career/jobs/`; both paths are ignored by git.
- Generated JD, version, output PDF, and public PDF paths are ignored by git. The New Job workflow refreshes only the ignored local manifest; publishing a version remains an explicit manual action.
- Existing `career/versions/<slug>` directories are indexed without being moved or overwritten.
- The detailed local manifest is generated at `src/data/career-versions.local.json`, fetched only from the local dev server, and ignored by git.
- The public manifest is `src/data/resume-versions.json`. It is safe for the public app and must not include truth warnings, evaluation markdown, JD text, or application notes.
- External PDFs are for application materials. Truth warnings remain review-only and should be checked in `/career`, not shared with recruiters or pasted into public artifacts.

## Main Resume WYSIWYG Editor

The public resume route is the WYSIWYG surface. The resume keeps the same visual layout, project thumbnail behavior, colors, and spacing in preview mode. Editing is added as an overlay only after the local `Edit Mode` toggle is turned on.

Current behavior:

- Toggle edit mode on the main resume page.
- Select one resume module at a time and open a right-side module editor drawer.
- Use different forms for Education, Work Experience, Skills, Certificate & Reputation, Projects & Achievements, Publications, Posters, and Patents.
- Add, duplicate, remove, and reorder module entries from the canvas controls.
- Keep the clean public preview when edit mode is off.
- Save an editable local draft to browser `localStorage`.
- Use AI optimization blocks only in Work Experience, Projects, and Skills drawers.

Saving the WYSIWYG draft does not mutate `src/data/resume-en.json` or `src/data/resume-zh.json`. Treat it as a local review surface until the edited content is explicitly promoted into source resume data.

## Portfolio Studio

Portfolio Studio lives inside the local `/career` console. It is for semi-automated project and skills drafting before a human-approved update to the main web resume editor.

Use it when you have a new GitHub project, medical device/digital health project, or JD-specific evidence that should be considered for `picspin.github.io`:

1. Start the local console:
   ```bash
   npm run dev -- --host 127.0.0.1
   ```
2. Open `http://127.0.0.1:3000/career` and start or select the relevant New Job workflow.
3. Expand `Optional resume evidence workspace`, then enter the project title, role/date, GitHub URL, image path, concrete project evidence, and optional JD excerpt.
4. Click `Generate draft`.
5. Review the generated web project draft, resume bullet, and skill suggestions.
6. Bring approved project and skill elements into the matching Work, Projects, or Skills drawer on the main resume page.
7. Expand the review details only when you need the AI polish prompt or JSON payload for manual inspection.
8. Use `Clear` when you want to remove the saved Portfolio Studio form and draft from browser local storage.

The MVP intentionally does not call an external AI API, edit `src/data/resume-en.json`, edit `src/data/resume-zh.json`, publish the site, or submit applications. It creates local review material so the final resume and application flow still has a manual approval gate.

Portfolio Studio keeps the last form and draft in browser `localStorage` on the local machine only. This can include JD excerpts and project evidence, so clear it after sensitive drafting sessions.

## Visual JD Workflow

In local dev, the homepage exposes local Career-Ops navigation and the main resume page exposes the `Edit Mode` toggle. New Job is the only JD intake surface; Portfolio Studio is an optional disclosure below the Job results.

The JD Workflow panel is now a visual local pipeline:

- JD intake.
- Resume adapt.
- PDF render.
- Manifest refresh.
- JD/CV Score with six rubric dimensions and a 4.0 apply gate.

Running the workflow creates the Job, writes `career/jds/<slug>.md`, executes resume adaptation and PDF rendering, refreshes the manifest, and records the run in SQLite. Manual recovery commands appear only after the JD file has been created successfully.

## Application Agent

The Application Agent panel prepares a local browser-agent workflow from a job link:

- scan the job page,
- map application fields,
- attach the tailored resume PDF,
- pause for human confirmation.

The current implementation is a local workflow model and launch point. It does not bypass login, does not submit final applications, and does not upload anything without human confirmation.

The Agent can be switched into an active state in the console. Active mode shows a local log stream for scanning, field mapping, PDF attachment, and the final human confirmation pause.

Project images should stay under `public/images/projects/` and be referenced from the web resume with public paths such as `/images/projects/project-24.jpg`. Use an existing reviewed project image while a new visual asset is still being prepared.
