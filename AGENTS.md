# Agents

This file is the project's working agreement for coding agents. [`CLAUDE.md`](./CLAUDE.md) is a symlink to it.

## Prime Directive

**Follow the docs. Update the docs.**

Before writing any code, read the relevant documentation in `docs/`. After implementing a feature or refactoring, update the docs to reflect
the change. Drift between docs and code is a bug.

## Project Context

This repo is **Cem Yilmaz's personal site** at <https://cem-yilmaz.de>:

- **Public**: portfolio landing, about, CV, projects showcase, legal pages, and a visitor AI chat ("Ask me anything") that answers questions
  about Cem and lets visitors submit OTP-verified project requests. See `docs/features/chat-visitor.md` and
  `docs/features/project-requests.md`.
- **Private** (`/workspace`, gated by session `userId` + `Users.isAdmin`): admin AI assistant, content editors, and focus areas (projects,
  todos, media, travel, fitness, nutrition, medical, finances, tax, inventory, compass, and more). See `docs/features/` for each surface.

There is **one environment**: pushes to `main` deploy to production via Coolify. No staging branch.

## Before You Start

1. Read `docs/conventions.md` — follow every convention without exception
2. Read `docs/documentation.md` — understand where docs live and what goes where
3. Read the relevant `docs/architecture/*.md` files for the area you are working in
4. Read the relevant `docs/features/*.md` files when the task touches a shipped surface
5. Read `docs/infrastructure.md` if your change affects deployment, CI, or environment variables

## Working Boundaries

- **Do not create new branches** unless the user explicitly asks you to. Work on the currently checked-out branch.
- **Do not create or switch into a git worktree** unless the user explicitly asks for one. Never invoke `EnterWorktree`, `git worktree add`,
  or spawn an agent with `isolation: "worktree"` on your own initiative.
- **Do not commit or push** unless the user explicitly asks. If you're on `main` and the user asks you to commit, stop and ask first —
  `main` deploys to production via Coolify.
- If you think a branch or worktree would genuinely help (e.g. parallel agents that would otherwise conflict), surface that as a suggestion
  and wait for approval before acting.

## Conventions (Summary)

These are non-negotiable. The full details are in `docs/conventions.md`.

- **Package manager**: npm only. Never use yarn or pnpm.
- **Naming**: entity-action (`sessionUpsert`, `userFindOne`, `toGqlSession`, `guardUserSubscription`)
- **Generated files — do not edit**: `src/routeTree.gen.ts`, `src/server/graphql/generated.ts`, `src/web/graphql/generated.ts`, `drizzle/`
- **Icons**: Lucide React only (`lucide-react`)
- **UI components**: base primitives in `src/web/components/base/`, app components in `src/web/components/`
- **Class merging**: use `cn()` from `src/web/utils/cn.ts`
- **Motion**: every animation must answer a question the user is already asking — see [docs/styles/motion.md](./docs/styles/motion.md) for
  the guardrails, anti-patterns, and reduced-motion stance. No motion library; reuse `Reveal` / `useInView`.
- **GraphQL schema**: SDL-first in `src/server/graphql/schema.graphqls`. Run `npm run graphql:generate` after any schema change.
- **Resolver wiring**: all in `src/server/graphql/resolversCreate.ts` — the only file that imports from commands/, queries/, and guards/
- **Commands**: two-phase writes — build all insert/update payloads first (pure), then run DB work in try/catch (transaction when
  multi-write). See [docs/conventions.md](./docs/conventions.md#commands-database-writes).
- **Environment variables**: never read `process.env` directly — only via `environmentVariablesCreate()`. See
  [docs/architecture/environment.md](./docs/architecture/environment.md).
- **Bilingual copy**: this site is DE + EN. Use the inline `{ de: '…', en: '…' }[locale]` literal **at the call site** — no i18n library and
  no page-level `COPY` const. Hoist a small named const only for strings reused within the file (e.g. shared by `seoMeta()` and the `<h1>`)
  or needed outside JSX (`aria-label`, `alt`, JSON-LD). See [docs/conventions.md](./docs/conventions.md#bilingual-copy).
- **Bilingual DB content**: paired `*De` / `*En` text columns (e.g. `roleDe`, `roleEn`), exposed as paired `*De` / `*En` GraphQL fields. See
  [docs/architecture/content-model.md](./docs/architecture/content-model.md).
- **Static identity content**: lives under `src/web/content/` (e.g. `personalInfo.ts`). Imported by both server and client. PR-edited.
- **SEO**: every public page uses `seoMeta()` and is listed in `src/web/seo/sitemapRoutes.ts` when indexable. Workspace / private pages pass
  `noindex: true` and stay out of the sitemap.
- **Jobs**: handlers in `src/server/jobs/handlers/`, registered in `jobDefinitions.ts`; enqueue via `serverRuntime.jobs.enqueue()`.
- **Comments**: only comment if there is no other way to make the code self-explanatory — prefer better names, smaller functions, and
  clearer types
- **Quality checks**: run `npm run check` and `npm test` before considering any task complete

## Architecture at a Glance

One row per doc under `docs/architecture/`. Feature behavior lives in `docs/features/` — do not duplicate it here.

| Concern                      | Doc                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------ |
| Server-side structure        | [`server-architecture.md`](./docs/architecture/server-architecture.md)         |
| Dependency injection         | [`dependency-injection.md`](./docs/architecture/dependency-injection.md)       |
| Environment variables        | [`environment.md`](./docs/architecture/environment.md)                         |
| Authentication               | [`authentication.md`](./docs/architecture/authentication.md)                   |
| Authorization                | [`authorization.md`](./docs/architecture/authorization.md)                     |
| Workspace access             | [`authorization-workspace.md`](./docs/architecture/authorization-workspace.md) |
| API layer                    | [`api-layer.md`](./docs/architecture/api-layer.md)                             |
| State synchronization        | [`state-synchronization.md`](./docs/architecture/state-synchronization.md)     |
| Jobs                         | [`jobs.md`](./docs/architecture/jobs.md)                                       |
| Browser capture (Playwright) | [`browser-capture.md`](./docs/architecture/browser-capture.md)                 |
| Persistent logging           | [`logging.md`](./docs/architecture/logging.md)                                 |
| SEO                          | [`discovery-seo.md`](./docs/architecture/discovery-seo.md)                     |
| AI-search (GEO)              | [`discovery-geo.md`](./docs/architecture/discovery-geo.md)                     |
| Content model                | [`content-model.md`](./docs/architecture/content-model.md)                     |
| File storage                 | [`file-storage.md`](./docs/architecture/file-storage.md)                       |
| i18n                         | [`i18n.md`](./docs/architecture/i18n.md)                                       |
| Chat foundation              | [`chat.md`](./docs/architecture/chat.md)                                       |
| Chat persistence             | [`chat-persistence.md`](./docs/architecture/chat-persistence.md)               |
| Agent delegation             | [`agent-delegation.md`](./docs/architecture/agent-delegation.md)               |

## How to Add Things

### New Database Table

1. Define in `src/server/db/schema.ts` with `pgTable()`
2. Export inferred types: `type Foo = typeof foo.$inferSelect`, `type FooCreate = typeof foo.$inferInsert`
3. Generate migration: `npm run db:generate`
4. Apply migration: `npm run db:migrate` (or `npm run db:push` for quick dev iteration)

### New GraphQL Operation

1. Add types/fields to `src/server/graphql/schema.graphqls`
2. Run `npm run graphql:generate`
3. Implement the command (mutation) or query in `src/server/commands/` or `src/server/queries/`
4. Add a mapper in `src/server/mappers/` if transforming DB types to GraphQL types
5. Wire the resolver in `src/server/graphql/resolversCreate.ts`
6. For protected operations, add a guard in `src/server/guards/` and call it in the resolver
7. Add the client-side `.graphql` operation file alongside the route or component

### New Public Page

1. Add the route under `src/routes/{-$locale}/` (the `{-$locale}` segment makes the page bilingual at `/page` and `/en/page`)
2. Use `seoMeta()` in `head()` with bilingual `title` / `description`
3. **Add the path to `src/web/seo/sitemapRoutes.ts`** if it should be indexed
4. Bilingual page copy uses the `{ de: '…', en: '…' }[locale]` pattern

### New Workspace Page

1. Add the route under `src/routes/{-$locale}/workspace/`
2. Pass `noindex: true` to `seoMeta()` — do **not** add the path to `sitemapRoutes.ts`
3. Gate data through the admin GraphQL namespace (`Session.user.admin` / `Mutation.admin`); see
   [docs/architecture/authorization-workspace.md](./docs/architecture/authorization-workspace.md)
4. Follow an existing focus-area route for layout (shared workspace chrome owns header / back-link)
5. Document the surface in `docs/features/workspace-{name}.md`

### New Background Job

1. Add a handler in `src/server/jobs/handlers/{entityAction}.ts` exporting a `RecurringJobDefinition` or `QueuedJobDefinition`
2. Register it in `src/server/jobs/jobDefinitions.ts`
3. Re-export from `src/server/jobs/index.ts` if callers need it
4. Enqueue queued jobs via `serverRuntime.jobs.enqueue(definition, data, options)`
5. See [docs/architecture/jobs.md](./docs/architecture/jobs.md) for the full recipe

### New Agent Tool

1. Prefer colocating the AI-SDK `tool()` wrapper on the command it wraps (under `src/server/commands/`), not a separate `agents/toolX.ts`
2. For domain work on the personal assistant, add or extend a sub-agent and a `delegateTo…` tool on the orchestrator — see
   [docs/architecture/agent-delegation.md](./docs/architecture/agent-delegation.md)
3. Wire tools into the relevant agent factory under `src/server/agents/`
4. Update the matching `docs/features/` doc (and architecture docs if the pattern changes)

### New Feature

1. Implement following the patterns above
2. Create a feature doc in `docs/features/{feature-name}.md` covering: user behavior, options considered, option chosen, implementation
   details

### New Architectural Decision

1. Create a doc in `docs/architecture/{decision-name}.md` covering: context, decision, alternatives considered, consequences
2. Add a row to the Architecture table above

## Documentation Update Rules

You MUST update documentation when any of the following occur:

| What Changed                          | What to Update                               |
| ------------------------------------- | -------------------------------------------- |
| New feature implemented               | Add `docs/features/{feature}.md`             |
| New convention established            | Update `docs/conventions.md`                 |
| New architectural pattern introduced  | Add `docs/architecture/{pattern}.md`         |
| Existing architecture changed         | Update the relevant `docs/architecture/*.md` |
| Deployment or CI changed              | Update `docs/infrastructure.md`              |
| File renamed, moved, or deleted       | Update any doc that references it            |
| Environment variable added or changed | Update `docs/infrastructure.md`              |

If you are unsure whether a doc needs updating, it does.

## Project Structure

```txt
src/
├── routes/          TanStack Router — public under {-$locale}/, private under workspace/, GraphQL under api/
├── server/          CQRS (commands/, queries/, guards/, mappers/), agents/, jobs/, graphql/, db/, env/, domain/
├── web/             UI (components/, content/, hooks/, seo/, chat/), GraphQL client, utils/
├── shared/          Isomorphic helpers (locale, date/currency formatting) used by web + server
├── router.tsx
├── routeTree.gen.ts Generated (DO NOT EDIT)
└── styles.css

docs/
├── conventions.md       Working agreements
├── documentation.md     What goes where under docs/
├── infrastructure.md    Deploy, CI, env vars
├── architecture/        Structural decisions (see table above)
└── features/            Shipped feature docs
```

## Tech Stack

- **Runtime**: Node.js, TypeScript 6
- **Frontend**: React 19, TanStack Router + Start, URQL, Tailwind CSS 4, shadcn/Radix UI
- **Backend**: Apollo Server 5, Drizzle ORM, PostgreSQL
- **Real-time**: graphql-sse (SSE), PostgreSQL NOTIFY/LISTEN
- **Validation**: Zod 4
- **AI**: Vercel AI SDK + Google Gemini
- **Testing**: Vitest, Playwright
- **Build**: Vite 8
- **CI**: GitHub Actions
- **Deployment**: Docker via Coolify, single environment, `main` → prod
