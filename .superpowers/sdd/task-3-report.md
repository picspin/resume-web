Status: DONE

Files changed:
- `src/career/applicationState.js`
- `src/career/useApplicationState.js`
- `src/career/careerRows.js`
- `src/career/__tests__/applicationState.test.mjs`
- `src/career/__tests__/careerRows.test.mjs`

What changed:
- Added the localStorage-backed application state helpers requested by Task 3: `CAREER_STORAGE_KEY`, `readApplicationState`, `writeApplicationState`, and `updateApplicationRecord`.
- Added the React hook wrapper `useApplicationState` that initializes from storage, persists state on change, and exposes a record update callback.
- Added the row derivation helpers `deriveCareerRows` and `getDefaultApplyDraft` for the future career console UI.
- Added focused node:test coverage for the application-state and row derivation behavior.

Commands run and results:
- `sed -n '1,240p' .superpowers/sdd/task-3-brief.md` — read the task brief successfully.
- `node --test src/career/__tests__/applicationState.test.mjs` — failed first with the expected missing-module error, then passed after implementation.
- `node --test src/career/__tests__/careerRows.test.mjs` — passed after implementation.
- `npm run career:test` — passed.
- `npm run build` — passed.

Commit:
- Planned message: `feat: add local application state helpers`
- Commit created: `72d9822` — `feat: add local application state helpers`

Self-review notes:
- The helpers stay pure and narrowly scoped to the brief.
- State reads are tolerant of missing storage and corrupt JSON.
- Row derivation preserves version data, overlays saved application state, and keeps the next-action mapping deterministic.
- No UI components, manifest generation, or generated data were modified.

Review fix notes:
- Replaced the `window.localStorage` default with `resolveApplicationStorage()` so `readApplicationState()`, `writeApplicationState()`, and `useApplicationState()` no longer throw in non-browser contexts.
- Hardened `writeApplicationState()` so unavailable storage and `setItem()` failures are ignored instead of bubbling.
- Added a focused hook smoke test in `src/career/__tests__/useApplicationState.test.mjs` that server-renders a component with `window` removed, which catches the missing-window default behavior.
- Added small storage-failure and resolver tests to ensure write errors stay non-fatal and `window.localStorage` access failures stay harmless.

Latest test results:
- `node --test /private/tmp/resume-web-worktrees/codex/medical-resume-ops/src/career/__tests__/applicationState.test.mjs /private/tmp/resume-web-worktrees/codex/medical-resume-ops/src/career/__tests__/useApplicationState.test.mjs /private/tmp/resume-web-worktrees/codex/medical-resume-ops/src/career/__tests__/careerRows.test.mjs` — passed (9 tests)
- `npm run career:test` — passed (12 tests)
- `npm run build` — passed

---

Status
- PASS

Files changed
- `src/career/ResumePreview.jsx`
- `src/career/PortfolioStudio.jsx`
- `src/career/CareerConsole.jsx`
- `src/career/__tests__/careerConsoleComponents.test.mjs`
- `src/career/__tests__/careerBuildPrivacy.test.mjs`
- `.superpowers/sdd/task-3-report.md`

Tests run
- FAIL — `npm run career:test`
  - Summary: 32 passed, 2 failed; expected red phase with missing `src/career/ResumePreview.jsx` and absent preview workspace in `CareerConsole`.
- FAIL — `npm run career:test`
  - Summary: 33 passed, 1 failed; `ResumePreview` existed, but the empty preview state did not yet render the `Resume Preview` heading expected by the brief test.
- PASS — `npm run career:test`
  - Summary: 34 passed, 0 failed.

Commit hash(es)
- Final Task 3 commit is the current `HEAD` for `feat: preview portfolio drafts in resume layout` and is returned in the task response.

Self-review notes
- `PortfolioStudio` now reports saved, generated, and cleared drafts upward without mutating resume source data.
- `CareerConsole` builds preview data in memory from `resume-en.json` plus the current draft and renders it through the existing `ResumeSection`.
- `ResumePreview` keeps the empty state local-only message visible while using the same preview shell for populated and unpopulated states.
- Production privacy coverage now blocks the new WYSIWYG strings from default builds.

Concerns
- None.
