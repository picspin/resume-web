# Career WYSIWYG Console Design

## Goal

Upgrade the local `/career` console from a command-oriented review board into a WYSIWYG resume workspace. The user should be able to enter a JD and new project evidence, generate a draft, and immediately preview how the draft would look inside the existing web resume layout before deciding whether to apply it to source resume data or use it for a job-specific application pack.

## Scope

This design extends the existing local-only Career Console and Portfolio Studio. It does not make `/career` public, does not submit applications, and does not automatically publish `picspin.github.io`.

In scope:

- Add a visible entry from the public resume homepage to `/career` when the app is running locally with `VITE_ENABLE_CAREER_CONSOLE=true`.
- Generate an in-memory resume preview from Portfolio Studio drafts.
- Render that preview with the same resume layout and project thumbnail interactions used by the public resume.
- Replace the command-only JD Intake Helper with a visual JD workflow that can prepare a slug, hold JD text, and show the command steps as guided actions.
- Keep copyable commands for the existing resume-ops scripts until a trusted local command runner is explicitly added.

Out of scope for this slice:

- No browser-side file writes to `career/jds/*.md`.
- No automatic mutation of `src/data/resume-en.json` or `src/data/resume-zh.json`.
- No external LLM API calls.
- No automatic shell command execution from the browser.
- No automated job application submission.
- No public production exposure of `/career` implementation details.

## User Experience

### Local Entry

When the app is in local dev mode and the career console flag is enabled, the resume homepage shows a compact `Career Console` control near the existing header controls. It navigates to `/career`. In default production builds, the entry is absent.

### Portfolio Draft To Preview

Portfolio Studio keeps the existing input workflow: project title, project type, role/date, GitHub URL, image path, evidence, and optional JD context. After `Generate draft`, the console produces:

- web project draft,
- resume bullet,
- skill suggestions,
- AI polish prompt,
- review payload,
- preview resume data.

The preview resume data is an in-memory copy of the base English resume plus draft additions:

- `projects`: append the draft project.
- `skills`: append generated skill lines unless already present.
- optional preview metadata: show the resume bullet in a local-only preview panel, not in public resume data.

The preview renders through the existing public resume components so layout, project cards, thumbnails, hover behavior, and modal preview match the live site.

### JD Workflow

The JD Intake Helper becomes a guided local workflow:

- JD title/company input.
- generated slug preview.
- JD text textarea.
- copyable target path, for example `career/jds/<slug>.md`.
- copyable commands for:
  - `npm run resume:adapt -- --jd career/jds/<slug>.md --slug <slug>`
  - `npm run resume:pdf -- --slug <slug>`
  - `npm run resume:manifest`
- local status checklist explaining which steps are still manual in this MVP.

The current load error should no longer read like a failure state when no local career versions exist. Instead, the console shows an empty workspace state that invites the user to create a draft or prepare a JD workflow.

## Components

### `CareerEntry`

A small local-only navigation control rendered by the homepage app shell when `isCareerConsoleEnabled` would allow `/career`. It should not be included in production output markers tested by the privacy build test.

### `portfolioPreview`

A pure helper module that merges a Portfolio Studio draft into a base resume object without mutating the source object. It provides deterministic behavior suitable for unit tests.

Expected behavior:

- preserve base resume fields,
- append draft project,
- append unique skill lines,
- return preview metadata for resume bullets,
- ignore empty draft input safely.

### `ResumePreview`

A Career Console panel that renders the generated preview. It should use the existing public resume components where practical, especially `ResumeSection`, so the preview reflects the actual public layout.

### `JdWorkflow`

A visual replacement or expansion for `JdIntakeHelper`. It manages local form state, slug generation, command previews, and copy actions. It does not write files or run commands.

## Data Flow

1. User enters project evidence and optional JD context.
2. `buildPortfolioDraft(form)` creates a truth-bounded draft.
3. `buildResumePreview(baseResume, draft)` creates a preview resume object.
4. Career Console displays:
   - draft review payload,
   - preview resume layout,
   - JD workflow commands.
5. User manually copies commands or payload after reviewing the result.

## Error Handling

- If no local career versions are loaded, show an empty workspace message, not a hard error.
- If a draft has warnings, show them next to the preview and keep the preview marked as review-only.
- If an image path is missing, use an existing tracked project image fallback from `public/images/projects/`.
- If clipboard copy is unavailable, show a non-blocking status message.

## Privacy And Security

- `/career` remains gated by local dev mode and `VITE_ENABLE_CAREER_CONSOLE=true`.
- Default production builds must not include WYSIWYG console markers, local storage keys, command strings, JD workflow copy, or Portfolio Studio implementation strings.
- Generated project descriptions remain HTML-escaped in preview payloads; the resume renderer now uses safe structured rendering rather than raw HTML injection.
- JD text and project evidence may persist only in browser `localStorage` for local convenience. The UI must offer a clear action.

## Testing

Unit and integration coverage should include:

- `buildResumePreview` appends projects and unique skills without mutating base data.
- missing draft returns the original resume shape safely.
- Career Console renders Portfolio Studio, JD workflow, and resume preview entry points.
- homepage renders a local Career Console entry only when the dev career flag is enabled.
- production privacy build test rejects new WYSIWYG markers.
- existing `npm run career:test`, `npm run lint`, and `npm run build` pass.

Manual verification:

- Start `VITE_ENABLE_CAREER_CONSOLE=true npm run dev -- --host 127.0.0.1 --port 5173`.
- Open `http://127.0.0.1:5173/` and confirm the local Career Console entry appears.
- Open `http://127.0.0.1:5173/career`, generate a project draft, and confirm the resume preview shows the new project and skills in the actual resume layout.
