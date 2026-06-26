# Portfolio Studio Design

## Goal

Add a local-only Portfolio Studio to the existing `/career` console so Xiaolei Zhu can semi-automatically turn new project evidence, GitHub links, project images, and JD context into reviewed web-resume project drafts and skills suggestions.

## Principles

- Local first: the studio is available only through the existing local `/career` route.
- Human reviewed: generated content is a draft, never an automatic public publish.
- Truth bounded: drafts should reframe supplied evidence but must not invent metrics, project ownership, regulatory claims, hiring authority, or signed deals.
- Asset friendly: `public/images/projects/` is the project-image asset directory and should be preserved.
- No external AI dependency in MVP: generate deterministic drafts and an LLM-ready prompt that can be copied to a trusted local model or assistant.

## MVP

- Add a Portfolio Studio panel inside `/career`.
- Accept project title, project type, role/date, GitHub URL, image path, raw project evidence, and optional JD context.
- Generate:
  - web project draft aligned with the existing `resume.projects[]` shape,
  - resume bullet draft,
  - categorized skills suggestions,
  - AI polish prompt,
  - JSON patch payload for manual review.
- Store no project data in the public build by default.
- Keep final write-to-file as a later phase.

## Not Doing Yet

- No GitHub API auto-sync.
- No external LLM API calls or API keys.
- No browser-based file writes.
- No automatic mutation of `src/data/resume-en.json` or `src/data/resume-zh.json`.
- No automated job application submission.
