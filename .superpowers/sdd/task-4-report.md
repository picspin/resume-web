Status: DONE_WITH_CONCERNS

Files changed:
- `src/career/CareerConsole.jsx`
- `src/career/careerData.js`
- `src/career/ApplicationBoard.jsx`
- `src/career/EvidenceReview.jsx`
- `src/career/ApplyPack.jsx`
- `src/career/JdIntakeHelper.jsx`

Commands run with results:
- `npm run career:test` — passed, 12 tests green.
- `npm run resume:manifest` — passed, wrote 1 public resume version and 1 local career version.
- `VITE_ENABLE_CAREER_CONSOLE=true npm run build` — passed, production build completed with lazy `CareerConsole` chunk output.
- `npm run build` — passed, standard production build completed.
- `VITE_ENABLE_CAREER_CONSOLE=true npm run dev -- --host 127.0.0.1 --port 4173` — server started successfully at `http://127.0.0.1:4173/`.

Manual verification:
- Confirmed the local dev server starts with the career gate enabled.
- Confirmed `/career` and `/` both serve the Vite app shell from the local dev server.
- Attempted browser automation against `/career`, but the environment lacked a usable Playwright browser runtime and system Chrome headless launch aborted, so full DOM-level interaction checks were not completed here.

Implementation summary:
- Added the runtime local data loader in `src/career/careerData.js` so `career-versions.local.json` is fetched at runtime rather than statically imported.
- Replaced the placeholder `CareerConsole` with the local-only operational workspace from the brief: summary counters, application board, evidence review, manual apply pack, and JD intake helper.
- Kept the UI dense and utilitarian with native controls and modest panel styling consistent with the existing app.
- Left the root `/` resume layout untouched; the public resume route and thumbnail behavior remain in `src/App.jsx`.

Self-review notes:
- The console stays scoped to Task 4 and consumes the existing `deriveCareerRows`, `useApplicationState`, and `getDefaultApplyDraft` contracts without introducing new shared abstractions.
- The runtime loader keeps the private local manifest out of source imports; the built chunk contains the fetch path string but not a static JSON module import.
- Status, application URL, and notes are wired through `updateRecord`, so persistence behavior follows the Task 3 local storage helper.
- No automatic submission path was added; the apply pack is read-only drafting plus manual metadata fields only.

Concerns:
- Full browser interaction verification for row selection, persisted refresh behavior, and live PDF click-through was not feasible in this environment because no working headless browser runtime was available locally.

Commits created:
- `159fb01 feat: add local career console UI`

Follow-up fix for review findings:
- Added `jd_captured` to `src/career/ApplicationBoard.jsx` so the status selector can round-trip every valid state used by `src/career/careerRows.js`.
- Added compact visible labels for the status control and all three read-only draft textareas in `src/career/ApplyPack.jsx`, keeping the panel operational while giving each field a clear accessible name.

Verification after the fix:
- `npm run career:test` — passed, 12 tests green.
- `VITE_ENABLE_CAREER_CONSOLE=true npm run build` — passed, production build completed successfully.
- `npm run build` — passed, production build completed successfully.

Follow-up fix section (Task 4 review round 2):
- Added recoverable load handling in `src/career/CareerConsole.jsx` so a rejected local data fetch or JSON parse failure clears loading, preserves a compact local-only empty state, and surfaces a short recovery message instead of leaving `/career` stuck.
- Updated `src/career/ApplicationBoard.jsx` PDF links to open generated resumes in a new tab with `rel="noreferrer"` for clearer manual-review behavior.
- Added focused verification in `src/career/__tests__/careerConsoleComponents.test.mjs` covering:
  - load recovery contract for the career console loader
  - row selection callback wiring
  - status update callback wiring
  - PDF link rendering/open contract

RED evidence:
- `node --test src/career/__tests__/careerConsoleComponents.test.mjs` — failed before the fix with:
  - `TypeError: module.loadCareerConsoleState is not a function`
  - `AssertionError: expected PDF link target to equal "_blank"`

GREEN evidence:
- `node --test src/career/__tests__/careerConsoleComponents.test.mjs` — passed, 4/4 tests green after the fix.
- `npm run career:test` — passed, 16 tests green total after adding the new focused coverage.
- `VITE_ENABLE_CAREER_CONSOLE=true npm run build` — passed.
- `npm run build` — passed.
