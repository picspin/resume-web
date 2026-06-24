# Medical Resume-Ops

This workspace contains Xiaolei Zhu's medical/pharma resume adaptation system.

## Commands

- `npm run resume:sync` updates `career/data/master-resume.json` from the current Web resume data.
- `npm run resume:adapt -- --jd career/jds/sample-medical-digital-role.md --slug sample-medical-digital-role` generates a tailored resume version.
- `npm run resume:pdf -- --slug sample-medical-digital-role` renders a PDF and copies it to the public site assets.
- `npm run resume:manifest` updates the React version manifest.

## Truth Rules

The system can reframe and reorder existing evidence. It must not invent direct radiation therapy ownership, NMPA registration leadership, CTA/NDA ownership, signed deals, line management, or metrics not present in source evidence.
