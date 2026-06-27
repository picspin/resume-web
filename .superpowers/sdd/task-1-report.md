Status: DONE

Files changed:
- src/career/portfolioPreview.js
- src/career/__tests__/portfolioPreview.test.mjs

Tests run:
- `node --test src/career/__tests__/portfolioPreview.test.mjs` - FAIL as expected on the first run with `ERR_MODULE_NOT_FOUND` for `src/career/portfolioPreview.js`.
- `node --test src/career/__tests__/portfolioPreview.test.mjs` - PASS, 3 tests passed.

Commit hash(es):
- `02eb07144c70e66c118dc45e987223eaeb80e650`

Self-review notes:
- The helper stays pure and does not mutate `baseResume`.
- The merge behavior follows the draft shape from `buildPortfolioDraft`, including review-only metadata and unique skill ordering.

Concerns:
- None.

Task 1 review fix:
- Cloned `draft.webProject` before appending it to `resume.projects`, so edits to the preview project no longer flow back into the draft object.
- Hardened `appendUniqueSkills` so `null` and other non-array inputs are treated as empty arrays.
- Extended coverage with a mutation check on `preview.resume.projects[1]` and a null-input skill merge case.

Tests run:
- `node --test src/career/__tests__/portfolioPreview.test.mjs`

Commit hash:
- pending
