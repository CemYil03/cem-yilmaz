# TanStack Start Full-Stack Template

An opinionated starting point for multi-user, real-time, AI-enabled web apps.

**Stack:** TanStack Start + React 19 · Apollo Server v5 + URQL (SDL-first GraphQL) · Drizzle ORM + PostgreSQL · graphql-sse + PG
NOTIFY/LISTEN · pg-boss · Vercel AI SDK · Tailwind 4 + shadcn/Radix · Vitest + Playwright · Storybook · Docker via Coolify.

> **For Claude / coding agents:** the project's working agreement is in [`AGENTS.md`](./AGENTS.md) and [`CLAUDE.md`](./CLAUDE.md). The full
> architecture lives under [`docs/`](./docs/). **Read the docs before writing code; update the docs after.**

---

## Quick Start

```bash
# 1. Install (npm only — yarn / pnpm are blocked by package.json#engines)
npm install

# 2. Provision environment variables — see "Environment files" below
cp .env.local.example .env.local   # dev / drizzle / vite — edit, then fill secrets
cp .env.test.example  .env.test    # integration-test DB — point at a separate DB

# 3. Set up the database
npm run db:push              # quick dev: pushes schema directly
# or: npm run db:migrate     # apply committed migrations

# 4. Run the dev server
npm run dev                  # http://localhost:3000

# 5. Before pushing — run the full quality gate
npm run check                # format + lint + spell + types + knip + commitlint
npm test                     # vitest
```

---

## Environment files

The repo ships **two committed example files**; copy each to its real (gitignored) sibling on first setup. Validation rules and the full
table of variables live in [`docs/architecture/environment.md`](./docs/architecture/environment.md) and
[`docs/infrastructure.md`](./docs/infrastructure.md) — this section only covers _which file holds what_.

| Committed example    | Copy to      | Loaded by                                                                                      | Holds                                                                                                                      |
| -------------------- | ------------ | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `.env.local.example` | `.env.local` | Vite (`npm run dev`/`build`) and `drizzle.config.ts` (`db:push`/`migrate`/`generate`/`studio`) | All boot-required vars (`DATABASE_URL`, `sessionCookieName`, `WEB_PAGE_URL`) plus the capability and optional vars you use |
| `.env.test.example`  | `.env.test`  | `src/server/test/commandTestUtils.ts` (integration tests via dotenv)                           | Just `DATABASE_URL` for a **separate** test database that the test suite is free to truncate                               |

Notes:

- **Unit tests do not load any `.env` file** — they pass an explicit source object to `environmentVariablesCreate()`. See
  [`docs/architecture/environment.md`](./docs/architecture/environment.md).
- **Capability vars are intentionally optional in `EnvironmentVariables`** but become required when their feature runs:
  `GOOGLE_GENERATIVE_AI_API_KEY` (chat) and `SERVER_TOKEN_SECRET` (server-side rendering). If you delete the corresponding feature, drop the
  var from your `.env.local` and from the example file.
- **Production / preview** values are configured in Coolify (or wherever you deploy), not in any `.env*` file. The example files exist for
  local dev only.

---

## 🧭 Using This Template for a New Project

This is a **template repo**. The first commit is intentionally generic — every project that adopts it has to do a one-time pass through the
items below to make the app _its own_. **Treat this list as a checklist for the first PR after you fork.**

> **Heads-up: this README is template-shaped.** Most of what you are reading right now (the "Using This Template" walkthrough, the deletion
> guidance, the per-section "swap this for your domain" notes) is scaffolding for the _setup PR_, not documentation of your product. After
> you finish the steps below, replace the bulk of this file with a normal project README — but **keep the `Environment files` section above
> intact** (or move its content into `docs/infrastructure.md`). New contributors and CI need to know which `.env*` files to create on a
> fresh checkout, and that information has nowhere else to live.

### 1. Project identity

| What                       | File                                                 | Default to replace                                                                      |
| -------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Repo / package name        | `package.json` (`name`)                              | `tan-stack-start-full-stack-template` → your project's npm-style slug                   |
| README headline            | `README.md`                                          | the title and intro paragraphs of this file                                             |
| HTML `<title>`             | `src/routes/__root.tsx` (`head().meta`)              | `'Project name'` placeholder                                                            |
| PWA manifest               | `public/manifest.json`                               | `short_name`, `name`, `theme_color`, `background_color`                                 |
| Favicon                    | `public/favicon.ico`                                 | shipped with the generic TanStack icon                                                  |
| App icons (PWA)            | `public/logo192.png`, `public/logo512.png`           | shipped with the generic TanStack icons                                                 |
| robots.txt                 | `public/robots.txt`                                  | rules are sane defaults; review for your launch                                         |
| Sitemap                    | `public/sitemap.xml`                                 | `https://example.com/` placeholder — replace with your real URL or generate dynamically |
| 404 copy                   | `src/routes/__root.tsx` (`NotFound` component)       | "404 / Page not found" — adjust tone / brand voice                                      |
| Theme tokens / colors      | `src/styles.css` and `tailwind.config.*`             | Tailwind defaults + shadcn — pick your palette                                          |
| Conventional-commit scopes | `commitlint.config.ts` (`scope-enum` if you add one) | currently no scope restriction                                                          |

> **Tip:** search the codebase for the literal strings `Project name`, `example.com`, and `TanStack App` — that surfaces almost every
> placeholder above in one go.

### 2. Database & schema

The shipped `src/server/db/schema.ts` includes generic tables you'll almost always need (`users`, `sessions`, `chats`, `chatMessages`,
`fileUploads`, `logs`) plus chat-specific message variants. **Decide what to keep:**

- If you don't need chat → delete the chat tables, the chat commands/queries/mappers, the `src/server/agents/` directory, the chat schema in
  `schema.graphqls`, and `src/web/chat/`.
- If you don't need file uploads → drop `fileUploads`, `fileUploadCreate.ts`, `fileUploadLoad.ts`, and `src/routes/api/file-uploads.ts`.
- If you don't need server-side image rendering → drop `serverRuntime.browser`, the playwright dependency, the `SERVER_TOKEN_SECRET` env,
  and the runtime-stage Chromium install in the `Dockerfile`. See
  [`docs/architecture/server-side-rendering.md`](./docs/architecture/server-side-rendering.md).

After any schema edit:

```bash
npm run db:generate          # generate migration SQL into drizzle/
npm run db:migrate           # apply it
```

### 3. The default chat & AI agent — **adjust to your use case**

The template ships a working **demo** chat:

- **Agent:** `src/server/agents/agentUserConversation.ts` — a `ToolLoopAgent` (Vercel AI SDK) hitting Gemini 2.5 Flash, with the system
  prompt `You are a helpful assistant.` Replace this prompt with one that describes _your_ product, persona, and constraints.
- **Tools:**
  - `src/server/agents/toolPromptUserForInput.ts` — structured-input collection. Generic; usually fine to keep.
  - `src/server/agents/toolWriteToConsole.ts` — **a stand-in demo tool to exercise the approval-gating flow.** Delete it and add the tools
    your agent actually needs (database mutations, third-party API calls, etc.). Each tool should follow the same pattern: a Zod input
    schema and an optional `needsApproval` flag.
- **Provider:** wired via `serverRuntimeCreate.ts` (`serverRuntime.ai.userConversationModel()`). Swap the model id, switch providers, or add
  multiple model bindings here — agents stay testable because the model is injected.
- **UI:** `src/web/chat/` — composer, transcript, attachment grid. Restyle / re-skin as needed.
- **Persistence model:** polymorphic message rows (`chat_messages_*` tables joined into a discriminated union); see
  [`docs/architecture/chat-persistence.md`](./docs/architecture/chat-persistence.md). Don't reshape this lightly — the AI-SDK replay logic
  in `toModelMessages.ts` depends on it.

If chat isn't part of your product at all, see the deletion list above.

### 4. GraphQL schema

`src/server/graphql/schema.graphqls` defines `User`, `Chat`, the chat-message union, etc. Add your domain types here, then:

```bash
npm run graphql:generate     # regenerates server (GqlS*) and client (GqlC*) types
```

Wire every new resolver in `src/server/graphql/resolversCreate.ts` — that file is the single import point for commands, queries, and guards.

### 5. Background jobs (pg-boss)

The template ships two **example** handlers in `src/server/jobs/handlers/`:

- `staleSessionsCleanup.ts` — recurring; useful, can stay.
- `signupReminderSend.ts` — scaffolding for a queued, scheduled job. **Treat as an example** and replace with your own jobs.

To add a job: create a handler file under `src/server/jobs/handlers/`, then register its `JobDefinition` in
`src/server/jobs/jobDefinitions.ts`. Enqueue queued jobs via `serverRuntime.jobs.enqueue(definition, data, options)`. See
[`docs/architecture/jobs.md`](./docs/architecture/jobs.md).

### 6. Environment variables

The validated, typed env lives in `src/server/env/EnvironmentVariables.ts` and `environmentVariablesCreate.ts`. **Never read `process.env`
outside this file** — ESLint blocks it. The two committed example files (`.env.local.example`, `.env.test.example`) are the source of truth
for which keys exist locally; see [`Environment files`](#environment-files) above.

When you add a new external dependency (a payment provider, an email service, etc.):

1. Add the field to `EnvironmentVariables`.
2. Read and validate the underlying `process.env.X` in `environmentVariablesCreate.ts`.
3. Document it in [`docs/infrastructure.md`](./docs/infrastructure.md) (the env-var table) and in
   [`docs/architecture/environment.md`](./docs/architecture/environment.md) if there is a non-obvious "why".
4. Add it to **`.env.local.example`** with a placeholder value plus a comment explaining required-vs-optional, then add the real value to
   your `.env.local` and to Coolify (or wherever you deploy). If integration tests need it, add it to `.env.test.example` too.

When you delete a feature (chat, server-side rendering, …), also remove its capability var from both the type, the validator, and the
example file.

### 7. Authentication / session model

The template uses **automatic cookie-based sessions** (no signup wall) — see
[`docs/architecture/authentication.md`](./docs/architecture/authentication.md). The first request mints a session row; subsequent requests
carry the `sessionCookieName` cookie. There is _no_ email/password / OAuth / SSO out of the box.

If your product needs real auth, you'll typically:

1. Keep the session row as the trust anchor.
2. Add a `users.identityProvider` column or a separate `userIdentities` table.
3. Add a sign-in flow (OAuth callback route, email magic link, etc.) that _attaches_ a verified identity to the existing session.

Don't rip out `sessionUpsert` and the cookie-first design — most of the chat / subscription / state-sync code assumes a session exists for
every visitor.

### 8. Authorization

Guard functions live in `src/server/guards/` and are called from inside resolvers in `resolversCreate.ts`. As you add domain entities, add
guards (`guard{Entity}{Mutation|Subscription|Query}`) and call them from every resolver that needs them. See
[`docs/architecture/authorization.md`](./docs/architecture/authorization.md).

### 9. Internationalization

The template has a _scaffold_ for i18n via the `{-$locale}` route segment, `src/web/hooks/useLocale.ts`, and `LanguageSwitcher.tsx`. There
is no message catalog wired in by default — you bring your own (`react-intl`, `i18next`, plain object lookups, whatever fits). See
[`docs/architecture/i18n.md`](./docs/architecture/i18n.md).

If your product is monolingual at launch, you can either ignore the locale segment (it has a sensible default) or rip the `{-$locale}` layer
entirely.

### 10. Deployment (Coolify + GHCR) — pick your environment topology

CI/CD lives in `.github/workflows/pipeline.yml` (gates + deploy in one workflow) and `.github/workflows/storybook.yml` (Storybook to GitHub
Pages).

**First decision: how many runtime environments do you want?** [`docs/infrastructure.md`](./docs/infrastructure.md) describes both options
in detail — make this choice during setup, not later, because the secrets, branch rules, and Coolify applications you provision differ.

**Option A — Single environment (template default).** Every push to `main` that passes CI deploys directly to one Coolify application.
Per-PR previews are enabled on the same application. This is the default the shipped `pipeline.yml` is wired for; pick it for a new project,
an internal tool, or anything where a manual production gate is overkill. See [Default Setup](./docs/infrastructure.md#default-setup) and
[Per-PR Preview Deployments](./docs/infrastructure.md#per-pr-preview-deployments).

**Option B — `main` (test) + `production` (prod), recommended for any real product.** `main` deploys to a test/staging app; merging `main` →
`production` deploys to the production app. The `production` branch is your manual release gate. Pick it as soon as you have real users —
retrofitting later is more painful than starting here. Follow
[Extending to Multiple Environments](./docs/infrastructure.md#extending-to-multiple-environments) on day one rather than as a future
migration.

**Setup steps (both options):**

1. Create the Coolify Application(s) — one for Option A, two for Option B (test + production with separate domains, env vars, and PostgreSQL
   databases). Point each at `ghcr.io/<owner>/<repo>:latest`.
2. Configure the GitHub Actions secrets listed in [`docs/infrastructure.md`](./docs/infrastructure.md):
   - **Option A:** `COOLIFY_URL`, `COOLIFY_API_TOKEN`, `COOLIFY_SERVICE_UUID`, `WEB_APP_URL`, `DATABASE_URL_PROD`, `DATABASE_URL_PREVIEW`.
   - **Option B:** the per-environment secrets — `COOLIFY_SERVICE_UUID_TEST` / `COOLIFY_SERVICE_UUID_PROD` and (recommended)
     `COOLIFY_API_TOKEN_TEST` / `COOLIFY_API_TOKEN_PROD`.
3. Configure runtime env vars in each Coolify application.
4. Update `WEB_APP_URL` and any project-specific domain references (cookies, sitemap, OAuth redirect URIs).
5. Enable GitHub Pages → Source = "GitHub Actions" so Storybook can deploy.
6. **Option B only:** create the `production` branch, protect it, and edit `.github/workflows/pipeline.yml` to fan the `deploy` job out per
   branch (matrix or branch filter) per the doc. Make this the same PR that adds the production secrets so the wiring lands together.

### 11. Documentation

You inherit a `docs/` tree. Two things to do up front:

1. **Replace generic examples** in `docs/` with your domain (the chat samples, "Order/OrderItem" examples in `conventions.md`, etc. — keep
   the _shape_ of the docs, change the _examples_).
2. **Honor the prime directive going forward:** when you change architecture, code, or environment, update the docs in the same PR. See
   [`docs/documentation.md`](./docs/documentation.md) for what goes where.

### 12. Spell-check dictionary

`cspell.json` includes a project-specific word list. Add your product's domain terms (brand names, acronyms) so `npm run spell:check`
doesn't fail on them.

### 13. Final shake-out checklist

Before you call the new project "started":

- [ ] `npm run check && npm test` is green.
- [ ] `docker build -t app .` succeeds.
- [ ] Visiting `/api/health` in a deployed container returns the expected `{ status: 'ok', version: '<sha>' }`.
- [ ] First user can log in (or, in the cookie-only model, can navigate without a 500).
- [ ] You've run a real chat / domain interaction end-to-end against your real model and DB.
- [ ] You've removed every literal "TanStack" / "Project name" / "example.com" reference that doesn't belong.
- [ ] You've replaced the template walkthrough in this README with a real project README — but kept the `Environment files` section (or
      moved its content into `docs/infrastructure.md`) so future contributors know which `.env*` files to create on a fresh checkout.

---

## Documentation Map

| Read first                                           | When                                                                   |
| ---------------------------------------------------- | ---------------------------------------------------------------------- |
| [`docs/conventions.md`](./docs/conventions.md)       | Always. Naming, two-phase commands, generated files, testing patterns. |
| [`docs/documentation.md`](./docs/documentation.md)   | Before adding a doc — so you put it in the right place.                |
| [`docs/infrastructure.md`](./docs/infrastructure.md) | Touching deploy, CI, Dockerfile, env vars.                             |
| `docs/architecture/*.md`                             | Working in that area (api-layer, jobs, chat, auth, file-storage, …).   |
| `docs/features/*.md`                                 | Working on a shipped feature (chat, logging, navigation-progress).     |

---

## Common Commands

```bash
npm run dev                  # vite dev server, port 3000
npm run build                # vite + nitro production build into .output/
npm test                     # vitest (run --project=server or --project=web for one)
npm run check                # full quality gate — must pass before push
npm run db:generate          # drizzle-kit migration from schema.ts
npm run db:migrate           # apply committed migrations
npm run db:push              # push schema directly (dev only)
npm run db:studio            # drizzle studio
npm run graphql:generate     # regenerate GqlS*/GqlC* types from schema.graphqls
npm run storybook            # storybook dev, port 6006
```

---

## License

Add one. The template ships without a `LICENSE` file on purpose — pick what fits your project.
