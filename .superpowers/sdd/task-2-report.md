Status: DONE

Files changed:
- src/App.jsx
- src/career/CareerEntry.jsx
- src/career/__tests__/careerConsoleComponents.test.mjs
- src/career/__tests__/careerBuildPrivacy.test.mjs

Tests run:
- `npm run career:test` - FAIL on the first run, with `Could not resolve ".../src/career/CareerEntry.jsx"` as expected before the component existed.
- `npm run career:test` - PASS after implementation, 32 tests passed.

Commit hash(es):
- 6b1ab78

Self-review notes:
- The homepage entry is lazy-loaded only in development, so production bundles stay free of the local career UI markers.
- The entry is hidden on `/career`, which keeps the existing local console route behavior intact while exposing the homepage shortcut only on the normal resume page.
- The build privacy test now covers the new button label and icon name so the production bundle check will catch accidental leakage.

Concerns:
- `lucide-react` in this repo does not export `BriefcaseBusiness`, so the implementation uses the equivalent `Briefcase` icon while preserving the requested button text and behavior.
- None otherwise.
