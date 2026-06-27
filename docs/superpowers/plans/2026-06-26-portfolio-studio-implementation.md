# Portfolio Studio Implementation Plan

## Overview

Build a local-only Portfolio Studio inside the existing Career Console. The first slice focuses on draft generation and review/export, not automatic publishing.

## Tasks

### Task 1: Draft Generation Foundation

Acceptance criteria:
- `buildPortfolioDraft(input)` returns a web project draft, resume bullet, categorized skills, AI prompt, JSON patch, and warnings.
- Missing evidence produces review warnings.
- GitHub URL and image path are preserved in the draft.

Verification:
- `node --test src/career/__tests__/portfolioStudio.test.mjs`

### Task 2: Local UI Panel

Acceptance criteria:
- `/career` shows Portfolio Studio in empty and populated console states.
- User can enter project evidence, JD context, image path, and GitHub URL.
- User can generate and copy draft outputs without writing public files.

Verification:
- `npm run career:test`
- `npm run build`

### Task 3: Documentation

Acceptance criteria:
- `career/README.md` documents the Portfolio Studio MVP and asset-directory convention.
- README keeps the privacy boundary clear.

Verification:
- `npm run lint`
- `npm run build`
