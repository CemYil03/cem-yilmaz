# Infrastructure

## Deployment

This project is deployed via **Coolify** as a **Docker** container.

### Docker Build

The `Dockerfile` uses a multi-stage build:

1. **deps** — Installs all dependencies with `npm ci`
2. **build** — Copies dependencies, runs `npm run build` (Vite production build via TanStack Start)
3. **runtime** — Installs production-only `node_modules`, downloads Chromium + its system libraries, then copies the self-contained
   `.output/` bundle into a slim Node.js image

The `deps` stage installs the npm version declared in `package.json#packageManager` before running `npm ci`, so Docker builds resolve the
lockfile with the same npm version as CI. The runtime stage runs `npm ci --omit=dev` because **`playwright` is the one runtime dependency
that cannot be inlined into the nitro bundle** (Chromium-bidi loads via paths Vite cannot statically resolve, so `vite.config.ts` declares
it `external`). Everything else stays inlined — the runtime `node_modules` is effectively just `playwright` and its dependency closure. The
runtime stage strips `scripts.prepare` (`npm pkg delete scripts.prepare`) before installing, because `prepare` invokes `husky` — a
devDependency that `--omit=dev` skips, which would otherwise fail the install with `sh: 1: husky: not found`.

The runtime stage then runs `npx playwright install-deps chromium` and `npx playwright install chromium` to add the system libraries
Chromium needs (fonts, libnss, libatk, ...) and download the matching Chromium build. These steps live above the
`COPY --from=build /app/.output` so the multi-hundred-megabyte Chromium layer caches across application code changes. The Debian-based
`node:24-slim` base is required — Chromium's prebuilt binaries are linked against glibc and will not run on Alpine. See
[architecture/server-side-rendering.md](./architecture/server-side-rendering.md) for the full design.

#### Build output: nitro + TanStack Start

The `tanstackStart()` Vite plugin alone emits only a fetch-handler module (`export default { fetch }`) at `dist/server/server.js`. That
module has no top-level side effects — running it under Node imports the file and exits with code 0 without ever opening a port. To produce
a real Node entrypoint, `vite.config.ts` adds the `nitro/vite` plugin alongside `tanstackStart()`. Nitro wraps the fetch handler in a
`node:http` listener that reads `PORT` and `HOST` from the environment, and emits a self-contained bundle at `.output/server/index.mjs` with
its runtime dependencies inlined. This is the file the Dockerfile launches in production.

The final image contains only the `.output/` directory — no source, no `node_modules`, no `package.json`. Runtime deps (`react`,
`@tanstack/react-router`, `pg`, etc.) are inlined into the bundle by nitro, so the runtime stage does not need to install anything.

```bash
docker build -t app .
docker run -p 3000:3000 -e DATABASE_URL=... -e sessionCookieName=... -e WEB_PAGE_URL=... -e GOOGLE_GENERATIVE_AI_API_KEY=... app
```

### Health Check

The Dockerfile declares a `HEALTHCHECK` that hits `GET /api/health` (handler at `src/routes/api/health.ts`) every 30s using Node's built-in
`fetch`. The probe reads `process.env.PORT` (falling back to `3000`) so it always targets the same port nitro is listening on — Coolify
injects its own `PORT` value, and a hardcoded port would silently fail healthcheck and cause Traefik to respond with "no available server".
The endpoint returns `{ status: 'ok', version: '<commit-sha>' }` with HTTP 200 as soon as the HTTP listener is up — it deliberately does
**not** check the database, so a transient DB outage will not flap the container or trigger restarts.

The `version` field is the commit SHA of the running build. It is baked into the image at build time via the `BUILD_SHA` Docker build arg
(see `Dockerfile`), exposed as the `BUILD_SHA` environment variable inside the container, and read through `EnvironmentVariables.buildSha`.
When the image is built without the build arg (e.g. local `docker build` without `--build-arg BUILD_SHA=...`), `version` is `"unknown"`. The
CD workflow uses this field to verify a deploy actually replaced the running container — see
[Continuous Deployment](#continuous-deployment-cd-github-actions). The Docker `HEALTHCHECK` itself only inspects the response status, not
the body, so adding the field is backward compatible.

Coolify reads the image's `HEALTHCHECK` automatically; no extra configuration is needed in the Coolify UI. If you want a stricter readiness
probe (e.g. fail when the DB is unreachable), extend the handler — but be aware Coolify will then mark the container unhealthy and may
restart it during DB blips.

### Environment Variables

The following environment variables must be configured in the deployment environment. They are validated at startup by
`src/server/env/environmentVariablesCreate.ts` — see [architecture/environment.md](./architecture/environment.md).

| Variable                       | Required | Description                                                                                                                                                                                                                                                        |
| ------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`                 | Yes      | PostgreSQL connection string                                                                                                                                                                                                                                       |
| `sessionCookieName`            | Yes      | Name of the cookie used to store the session ID                                                                                                                                                                                                                    |
| `WEB_PAGE_URL`                 | Yes      | Absolute origin of the deployed site, no trailing slash (e.g. `https://example.com`). Drives canonical URLs, hreflang alternates, the dynamic `/sitemap.xml`, and `/robots.txt` — see [architecture/seo.md](./architecture/seo.md)                                 |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes      | Google Generative AI API key. Validated when `serverRuntimeCreate` builds the Gemini language model                                                                                                                                                                |
| `SERVER_TOKEN_SECRET`          | No\*     | HMAC secret signing short-lived server-side render tokens. Required only by features that call `serverRuntime.browser.capture()` against an authenticated `/server/*` route — see [architecture/server-side-rendering.md](./architecture/server-side-rendering.md) |
| `sessionCookieSecure`          | No       | Set to `"true"` in production to enable Secure + SameSite=None                                                                                                                                                                                                     |
| `sessionCookieDomainScope`     | No       | Cookie domain scope for cross-subdomain sessions                                                                                                                                                                                                                   |

### Database Migrations

Migrations are managed by Drizzle Kit. Run before or during deployment:

```bash
npm run db:migrate
```

Migration files live in the `drizzle/` directory and are committed to version control.

## Continuous Integration & Deployment (GitHub Actions)

CI and CD live in a single workflow: `.github/workflows/pipeline.yml`. Gate jobs run in parallel on every pull request and push to `main`;
if all gates pass on a push to `main`, the `deploy` job builds and ships a Docker image.

### Job graph

```
                      ┌─ commitlint ─────────┐
                      ├─ codegen ────────────┤
trigger ──────────────┼─ check ──────────────┼──── deploy (push to main only)
                      ├─ test ───────────────┤        (Docker build + push + Coolify)
                      └─ migrations-check ───┘
                          (matrix: prod, preview)
```

All gate jobs share the composite action at `.github/actions/setup` which runs `actions/setup-node@v6`, pins the npm version from
`package.json#packageManager`, and runs `npm ci`. Update there if you change the dependency-install flow.

### Gate jobs

**commitlint** — validates commit messages against the conventional-commits config.

**codegen** — verifies generated files are up to date (no database required):

1. `npm ci`
2. `npm run graphql:generate` and `npm run db:generate`
3. `git diff --exit-code` on `*.gen.ts` / `*.generated.ts` / `drizzle/` — fails if codegen output differs from what was committed, or if new
   untracked files appear

**check** — static analysis (no database required):

| Step   | Command              |
| ------ | -------------------- |
| Format | `prettier --check .` |
| Lint   | `eslint .`           |
| Spell  | `cspell .`           |
| Types  | `tsc --noEmit`       |
| Usage  | `knip`               |

**test** — runs against a PostgreSQL 17 service container:

1. `npm ci`
2. `drizzle-kit push` (applies schema to the test database)
3. `npm test`

**migrations-check** — verifies that prod and preview databases have applied every migration in the `drizzle/` folder. Runs as a matrix
(`prod`, `preview`) and fails the PR if any migration is missing — forces you to deploy migrations before merging schema-dependent code. The
script (`scripts/migrationsCheck.ts`) hashes each local migration's SQL with the same algorithm Drizzle uses internally
(`sha256(file content)`) and compares against rows in `drizzle.__drizzle_migrations`.

PRs from forks have no access to the DB secrets and so the job is skipped on them; require a maintainer push or branch to run the check.

### Deploy job

Runs only on `push` to `main` and only after every gate passes. Uses a separate concurrency group (`deploy-${{ github.ref }}`,
`cancel-in-progress: false`) so concurrent deploys queue rather than abort.

1. Builds a Docker image and pushes it to **GitHub Container Registry** (GHCR) with Docker layer caching
2. Tags the image with the commit SHA and `latest`
3. PATCHes the Coolify application to point to the new image tag
4. Restarts the application via the Coolify API
5. Polls `${WEB_APP_URL}/api/health` until the response's `version` field equals the deployed commit SHA — fails the workflow on timeout (~5
   minutes) so a Coolify restart that silently rolled back to the old image surfaces as a red deploy job

### Required secrets

| Secret                 | Description                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `COOLIFY_URL`          | Coolify instance URL (e.g. `https://coolify.example.com`)                                                                      |
| `COOLIFY_API_TOKEN`    | Coolify API token (Settings → API Tokens)                                                                                      |
| `COOLIFY_SERVICE_UUID` | Application UUID (visible in the application URL)                                                                              |
| `WEB_APP_URL`          | Public URL of the deployed app (e.g. `https://app.example.com`) — polled by the post-deploy verification step                  |
| `DATABASE_URL_PROD`    | Connection string used by `migrations-check (prod)` — recommend a role with `SELECT` on `drizzle.__drizzle_migrations` only    |
| `DATABASE_URL_PREVIEW` | Connection string used by `migrations-check (preview)` — recommend a role with `SELECT` on `drizzle.__drizzle_migrations` only |

## Coolify Deployment Strategy

This template ships with a **single-environment** default: every push to `main` that passes CI builds a Docker image and deploys it to one
Coolify application. There is no test/staging app and no `production` branch — you can add those later when the project actually needs them
(see [Extending to multiple environments](#extending-to-multiple-environments) below). Per-PR preview deployments are supported and
recommended.

### Default Setup

| Environment | Coolify Resource    | Branch      | Trigger                  |
| ----------- | ------------------- | ----------- | ------------------------ |
| Production  | Application         | `main`      | Push to `main` (CD)      |
| Preview     | Preview Deployments | PR branches | Pull request open/update |

**Setup in Coolify:**

1. Create a new Application (Docker → GHCR)
2. Set the image to `ghcr.io/<owner>/<repo>` with tag `latest` (CD updates this on every deploy)
3. Configure environment variables (`DATABASE_URL`, `sessionCookieSecure=true`, etc.)
4. Attach a PostgreSQL database resource
5. Set up the custom domain and SSL

The CD job in `.github/workflows/pipeline.yml` (CI and CD share a single workflow) is already wired for this: it builds the image, PATCHes
the Coolify application's image tag, and restarts the application via the Coolify API. The only required secrets are `COOLIFY_URL`,
`COOLIFY_API_TOKEN`, and `COOLIFY_SERVICE_UUID` (see [Required Secrets](#required-secrets)).

### Per-PR Preview Deployments

Preview deployments spin up an ephemeral instance for each pull request and tear it down when the PR is merged or closed. Coolify v4 manages
the lifecycle natively against the same Application — no additional CD workflow is required.

**Setup in Coolify:**

1. Open the production Application → **Preview Deployments** tab
2. Enable preview deployments
3. Set the **Base Domain** (e.g. `preview.example.com`) — each PR gets `pr-<number>.preview.example.com`
4. Configure environment overrides for previews (typically a shared preview database or per-PR database)

**Database options for previews:**

| Option                | Pros                       | Cons                                  |
| --------------------- | -------------------------- | ------------------------------------- |
| Shared preview DB     | Simple, low resource usage | PRs can interfere with each other     |
| Per-PR DB (scripted)  | Full isolation             | Requires setup/teardown scripts       |
| Seed-only (ephemeral) | Clean state every deploy   | No persistent test data across pushes |

For most teams, a **shared preview database** with schema push on deploy is sufficient:

```bash
# Add to your preview deploy command or Dockerfile entrypoint
npx drizzle-kit push
```

Connect the repository via the Coolify GitHub App and Coolify will post deployment status checks on each PR automatically.

### Database Migrations in Deployment

Run migrations as part of the deploy process:

```bash
# Option A: Run before restarting (CI/CD step after image push)
DATABASE_URL=<prod-url> npx drizzle-kit migrate

# Option B: Run on container start (entrypoint script)
#!/bin/sh
npx drizzle-kit migrate && node .output/server/index.mjs
```

Option A is safer — if the migration fails, the old container keeps running.

## Extending to Multiple Environments

When you outgrow the single-environment default, the typical next step is to split into a **test** environment that tracks `main` and a
**production** environment that tracks a dedicated `production` branch. Promoting becomes an explicit `main` → `production` merge, which
gives you a manual gate before production deploys.

| Environment | Coolify Resource | Branch       | Trigger                              |
| ----------- | ---------------- | ------------ | ------------------------------------ |
| Test        | Application      | `main`       | Push to `main` (CD)                  |
| Production  | Application      | `production` | Merge `main` → `production` (manual) |

### Steps to Extend

1. **Create a `production` branch** on GitHub from the current `main` and protect it (require PRs, restrict who can merge).
2. **Create a second Coolify Application** for production: same GHCR image, separate environment variables, separate domain, separate
   PostgreSQL database. Keep the existing application as the test environment.
3. **Generate a second Coolify API token** so each environment can be revoked independently. Add these GitHub Actions secrets:

| Secret                      | Description                 |
| --------------------------- | --------------------------- |
| `COOLIFY_SERVICE_UUID_TEST` | Test application UUID       |
| `COOLIFY_SERVICE_UUID_PROD` | Production application UUID |
| `COOLIFY_API_TOKEN_TEST`    | Token for test app          |
| `COOLIFY_API_TOKEN_PROD`    | Token for production app    |

You can keep using a single shared token if you prefer, but separate tokens are easier to rotate.

4. **Update `.github/workflows/pipeline.yml`** so both gate jobs and the deploy job run on pushes to `production` as well as `main`. The
   simplest shape is to add `production` to the existing trigger filter:

```yaml
on:
  pull_request:
    branches: [main, production]
  push:
    branches: [main, production]
```

5. **Update the `deploy` job in `.github/workflows/pipeline.yml`** to deploy each branch to its corresponding application — typically a
   matrix over `{ env: test, prod }` with a `branch == ref` filter, selecting the right `COOLIFY_SERVICE_UUID_*` / `COOLIFY_API_TOKEN_*` per
   entry.
6. **Promote with a PR**: when you want to release, open a PR from `main` → `production`. Merging it triggers `pipeline.yml` on
   `production`, which runs the gates and then the deploy job against the production application.

### Going Further

- **Additional environments** (e.g. a stakeholder demo app) — repeat the steps above with another application, branch, and secret pair.
- **Move previews off the test app** — by default, per-PR previews live alongside the `main`/test application. If you want previews to stage
  against production-like configuration instead, enable Preview Deployments on the production application and disable them on the test
  application.

## Storybook (GitHub Pages)

There is **only one Storybook**, built from `main` and deployed to GitHub Pages. Storybook documents components, which live in `main`, so a
production-branch Storybook would not show anything different — keep it single regardless of how many runtime environments you add.

Workflow: `.github/workflows/storybook.yml`

### How it works

The workflow runs on pushes to `main` that include at least one change under `src/web/components/`\*\*, or on manual `workflow_dispatch`.
GitHub's native `paths` filter handles the path check across the entire push range, so multi-commit pushes work correctly. The workflow runs
in parallel with CI — a CI failure on the same commit shows as a separate red check and does not block the deploy.

1. Installs dependencies and runs `npm run storybook:build`
2. Uploads the `storybook-static/` output as a Pages artifact
3. Deploys to GitHub Pages via `actions/deploy-pages`

URL: `https://<owner>.github.io/<repo>/`

### Setup

GitHub Pages must be configured in the repository settings:

**Settings → Pages → Source** → set to **GitHub Actions** (not "Deploy from a branch")
