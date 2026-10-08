# Cloud Deployment State

Last attempted: 2026-10-09. Pages deployment is being prepared; Sites is not live.

## Release Source

- GitHub PR: https://github.com/picspin/resume-web/pull/4
- Verified source commit: `6162f78ba978667730ae27e1cf674861a1316692`
- GitHub CI run `37774099775` passed tests, lint, build and security scan.
- Only public sample presentation is deployable. Career Console, personal JD
  records, generated private resumes, credentials and SQLite stay local.

## GitHub Pages

After the token permission update, the Pages API confirmed GitHub Actions
configuration and `https://picspin.github.io/resume-web/` as the site URL.
PR #4 was merged as `d5ba49280d3b1bf55bb315f4899d8401c82d4b24`.

Manual run `37808030589` passed validation but skipped deployment because of the
old `PAGES_ENABLED` gate. The workflow now uses explicit `deploy=true` on `main`
without that redundant variable. It still validates the release before publishing
the public build and gives Pages write/OIDC permissions only to the deploy job.

## Codex Cloud / Sites

- Reuse project ID: `appgprj_6ac78a0b92688191a648a95acb6d62e7`.
- Audience: owner-only; no public sharing change was made.
- Expected origin (not live): `https://picspin-resume-web.abloomskink1.chatgpt.site`.
- Static checkout: `/private/tmp/resume-web-codex-site`.
- Its `.openai/hosting.json` contains the persisted project ID and `static.directory=dist`.
- Pushed static source: `d90804ade3434573c0a56f4a24f21d53a19056cb`.
- Deployment archive: `/private/tmp/resume-web-codex-site-small.tar.gz`.
- Artifact built from the verified release with `VITE_BASE_PATH=/`.
- Unused project image variants were removed only from the static artifact;
  every image selected by either language remains, and repository assets are unchanged.

The first archive upload, a smaller-archive retry and the 2026-10-09 retry all
timed out after 300 seconds in the OpenAI blob upload service. No saved site version or
successful deployment was returned. Do not advertise the expected origin as live.

Resume by checking this same site's versions before saving again. Renew its
short-lived source credential only when needed; never create a replacement site
or store credentials here. If temporary files are gone, restore the pushed static
source using the Sites workflow, package it, and deploy the saved version.
