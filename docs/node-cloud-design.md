# Private Node Workspace

- Input: an explicitly built `dist-private` frontend and owner credentials supplied through the environment.
- Output: authenticated resume editing, `/career`, and the existing Career-Ops API on one origin.
- Public Pages continues to use `dist`; neither private bundles nor private records belong in that release.
- Reuse the existing runtime middleware and kernel, retaining local loopback checks for development.
- The cloud server enforces a fixed origin and owner authentication before serving any UI, API, or PDF.
- SQLite and generated career files require a persistent volume; deployment must not seed personal JD records.
- Keep secrets server-side and retain the final human application approval gate.
- First deployment is single-owner, single-instance; this is not a multi-user membership service.
- Resume drafts currently remain browser-local; cloud-backed cross-device draft storage is not yet implemented.
- Hosting credentials, TLS termination, persistent disk, browser execution and LLM configuration must be verified before declaring the full application live.

## Run and Deploy

```bash
npm ci
npm run build:private
# Set APP_ORIGIN, APP_OWNER_USER and APP_OWNER_PASSWORD via your secret manager.
npm start
```

`APP_ORIGIN` is the exact external HTTPS origin, without a trailing slash.
The owner password must be a random secret of at least 32 characters. First access
uses the browser's HTTP Basic authentication dialog. This is an owner-only gate,
not OAuth, membership, or a shared-user service. Terminate TLS at the cloud proxy;
preserve the original Host and set HOST=0.0.0.0 only within the private container.
Do not expose the backend port directly over public HTTP.

```bash
docker build -t resume-career-ops .
docker run --init --name career-ops \
  --env-file /secure/path/career-ops.env \
  -p 127.0.0.1:3000:3000 \
  --mount source=career-ops-data,target=/app/career \
  resume-career-ops
```

The image uses the existing locked Playwright dependency and installs its browser
and system requirements; it also installs git/gh for the existing sync service.
It excludes local databases, JD inputs, output PDFs, workflow snapshots and both
private manifests. Only tracked sample/reference content should be used as the
build context. No cloud credentials or GitHub tokens belong in the image.

Run one replica. Back up the career volume before upgrades; do not delete it to
redeploy. It includes the SQLite database and generated artifacts. Config/template
changes must be reconciled with this volume during upgrades. The frontend version
manifest is derived and can be regenerated from persisted career versions after
a restart. Drafts and saved resume versions still live in browser localStorage.

GitHub synchronization requires an explicitly scoped server-side GitHub credential;
local keychain/SSH credentials are not copied to cloud. Agent tools and real LLM
execution need their own configured integrations; hosting the current UI does not
turn deterministic scoring or role-play into live LLM calls. Final application
submission remains a human action.

## Validation State

The Node authentication/routing tests and private Vite build are locally verified.
A Chrome smoke test also confirms the private production homepage editing switch,
Career-Ops link, `/career` workflow and mobile console width without page errors.
The Docker daemon is not running on this machine, so the container image has not
been built or browser-tested here. A cloud host/account, TLS endpoint and persistent
volume have not yet been provisioned; no full-app cloud URL is live.

Browser container requirements: https://playwright.dev/docs/docker
Persistent volume lifecycle: https://docs.docker.com/engine/storage/volumes/
