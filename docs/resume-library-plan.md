# Resume Library: Scope and Verification

## Implemented Scope

- Default English/Chinese sample plus independent blank and duplicated documents.
- Local storage, revision conflicts, named versions and restore to a new document.
  Profile, images, sections, theme and ordering remain document-specific.
- JD workflows capture an immutable saved source. Results import independently
  without switching the editor automatically; failed runs can retry the same source.
- Print/PDF uses the current document with expanded content and no editor controls.
- GitHub sync requires exact content/target preview and explicit confirmation.
  Hidden sections, their titles and internal notes are excluded. Publication
  preserves unrelated remote files and rejects stale confirmations.
- Public builds contain the sample and allowlisted images only; local versions,
  generated PDFs and source maps are excluded. Console stays local.

## Verification Record

Latest verification used Node 22.23.2 and Playwright 1.61.1 with installed Chrome.
CI uses Node 24 and installs the locked Playwright Chromium.

- Lint and production build passed.
- Resume suite: 23 passed.
- Career suite: 143 passed, two opt-in skips, one local-listener sandbox failure.
  The failed browser test passed on rerun with permission and Chrome.
- Opt-in editor test passed: duplicate-control regression, real drag, versions,
  images, print controls and mobile drawer behavior.
- Opt-in public test passed after correcting preview's production base path.
- Build privacy tests: 3 passed after the preview-path correction.
- Synthetic desktop (1440px) and mobile (390px) flows passed without overflow or
  uncaught page errors. Coverage includes blank privacy, save/reload, duplication,
  themes, drag, versions, PDF text extraction, source/JD import, stale-result
  clearing, quota/corrupt-storage recovery, and mocked GitHub sync.
- Sync iframe rendered the exact HTML, retained its sandbox, and blocked a script
  sentinel. Mock conflicts and blocked scripts produce expected console errors.

Run the broader synthetic test against a running dev server:

```bash
RESUME_QA_READY=1 RESUME_QA_URL=http://127.0.0.1:5173 node scripts/qa/resume-library-browser.mjs
```

Screenshots, PDFs and report.json go to a new temporary directory. The last
successful run directory was `resume-library-qa-1791422665696`.

## Remaining Boundaries

- Historical sample visual parity is not a pixel-diff assertion.
- Live GitHub mutation and Pages activation were not exercised; sync tests mock
  publication. The existing token receives HTTP 403 from the Pages API.
- Open-dialog source invalidation and failed-image recovery remain outside the
  combined browser harness; focused tests cover related behavior.
- Workflow responses are mocked in browser QA, not live LLM generation or
  unattended application submission.

Only reviewed source changes belong in the release. Pre-existing local JD edits,
generated version manifests, tool configuration directories and credentials stay
out of the commit. Private code sync is distinct from public site publication.
