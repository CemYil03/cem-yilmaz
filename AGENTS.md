# Agents

## Prime Directive

**Follow the docs. Update the docs.**

Before writing any code, read the relevant documentation in `docs/`. After implementing a feature or refactoring, update the docs to reflect
the change. Drift between docs and code is a bug.

## Project Context

This repo is **Cem Yilmaz's personal site** at <https://cem-yilmaz.de>:

- **Public**: portfolio landing, projects showcase, markdown blog, web-tools showcase, and a visitor AI chat ("Ask me anything") that
  answers questions about Cem.
- **Private** (`/workspace`, GitHub-OAuth-gated): personal AI assistant and a content editor for the public portfolio. Future iterations add
  calendar, notes, tasks.

There is **one environment**: pushes to `main` deploy to production via Coolify. No staging branch.

The work is staged in phases — see `README.md` for the phase table. Phase 1 (de-template-ification + portfolio shell + legal pages) is in.
Phase 2 brings GitHub OAuth and dual-agent chat. Phase 3 brings the DB-backed projects/tools and the markdown blog.

## Before You Start

1. Read `docs/conventions.md` — follow every convention without exception
2. Read `docs/documentation.md` — understand where docs live and what goes where
3. Read the relevant `docs/architecture/*.md` files for the area you are working in
4. Read `docs/infrastructure.md` if your change affects deployment, CI, or environment variables

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
- **Bilingual copy**: this site is DE + EN. Use the inline `{ de: '…', en: '…' }[locale]` literal **at the call site** — no i18n library and
  no page-level `COPY` const. Hoist a small named const only for strings reused within the file (e.g. shared by `seoMeta()` and the `<h1>`)
  or needed outside JSX (`aria-label`, `alt`, JSON-LD). See [docs/conventions.md](./docs/conventions.md#bilingual-copy).
- **Bilingual DB content**: paired `*De` / `*En` text columns (e.g. `roleDe`, `roleEn`), exposed as paired `*De` / `*En` GraphQL fields. See
  [docs/architecture/content-model.md](./docs/architecture/content-model.md).
- **Static identity content**: lives under `src/web/content/` (e.g. `personalInfo.ts`). Imported by both server and client. PR-edited.
- **Comments**: only comment if there is no other way to make the code self-explanatory — prefer better names, smaller functions, and
  clearer types
- **Quality checks**: run `npm run check` before considering any task complete

## Architecture at a Glance

| Concern               | Pattern                                                                                                   | Key Files                                      |
| --------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Server-side structure | CQRS — commands/, queries/, mappers/                                                                      | `docs/architecture/server-architecture.md`     |
| Dependency injection  | ServerRuntime container                                                                                   | `src/server/domain/ServerRuntime.ts`           |
| Environment variables | Central validated `EnvironmentVariables` — no direct `process.env` reads                                  | `src/server/env/environmentVariablesCreate.ts` |
| Authentication        | Cookie-based automatic sessions; Phase 2 adds GitHub OAuth on top                                         | `src/server/utils/sessionUpsert.ts`            |
| Authorization         | Guard functions (`guard{Entity}{Ctx}`)                                                                    | `src/server/guards/`                           |
| Workspace access      | `isAdmin` column on `Users`; `guardAdmin` / `guardAdminMutation` enforce                                  | `docs/architecture/workspace-access.md`        |
| GraphQL               | SDL-first, Apollo Server v5, URQL client                                                                  | `src/server/graphql/schema.graphqls`           |
| Real-time             | Subscriptions over SSE, PostgreSQL NOTIFY/LISTEN                                                          | `src/server/graphql/PubSubPostgres.ts`         |
| Background jobs       | pg-boss via `serverRuntime.jobs.enqueue()`                                                                | `docs/architecture/jobs.md`                    |
| Server-side rendering | Singleton headless Chromium via `serverRuntime.browser.capture()`                                         | `docs/architecture/server-side-rendering.md`   |
| SEO                   | `seoMeta()` per page; dynamic `/sitemap.xml` and `/robots.txt`                                            | `docs/architecture/seo.md`                     |
| AI-search (GEO)       | `/llms.txt`, ProfilePage/FAQPage JSON-LD, AI bot allowlist, chat deep-link                                | `docs/architecture/ai-search.md`               |
| Code generation       | `npm run graphql:generate` — server `GqlS*`, client `GqlC*`                                               | `codegen.ts`                                   |
| Editable content      | DB tables (CV, future projects/blog/tools) + admin UI under `/workspace`                                  | `docs/architecture/content-model.md`           |
| Static identity       | Typed config under `src/web/content/`                                                                     | `src/web/content/personalInfo.ts`              |
| AI chat (Phase 1)     | Single-agent visitor chat ("Ask me anything")                                                             | `src/server/agents/agentVisitorAboutCem.ts`    |
| AI chat (Phase 2)     | Dual agents: visitor + workspace personal assistant                                                       | `docs/architecture/multi-agent-chat.md`        |
| AI chat titles        | Post-turn LLM titler with `NONE`-retry loop on the empty column                                           | `docs/features/chat-titles.md`                 |
| AI chat transcript    | Shared MessageScroller-backed transcript for every chat surface                                           | `docs/architecture/chat-transcript.md`         |
| AI model selection    | Per-turn admin choice + sticky default; catalog drives picker `accept`                                    | `src/server/agents/adminChatModels.ts`         |
| Compass (Phase 2+)    | AI-built summary / portrait / psychology from admin chats; firewalled                                     | `docs/features/workspace-compass.md`           |
| Media library         | Movies + channels, TMDB auto-fill, topic-clustered cross-views                                            | `docs/features/workspace-media.md`             |
| Inventory             | Items + valuations + service log + receipt uploads; material net worth                                    | `docs/features/workspace-inventory.md`         |
| Medical               | Health journal + appointment tracker; documentarian sub-agent with triage                                 | `docs/features/workspace-medical.md`           |
| Travel                | Trips → days → activities + per-trip packing list; planner sub-agent writes durable itineraries from chat | `docs/features/workspace-travel.md`            |
| Nutrition             | Cookbook + soft weekly meal plan + food/drink diary; sub-agent suggests snacks and logs intake            | `docs/features/workspace-nutrition.md`         |
| Fitness               | Gym log (sessions → sets) + reusable routines + exercise catalog; sub-agent logs workouts from chat       | `docs/features/workspace-fitness.md`           |

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

### New Feature

1. Implement following the patterns above
2. Create a feature doc in `docs/features/{feature-name}.md` covering: user behavior, options considered, option chosen, implementation
   details

### New Architectural Decision

1. Create a doc in `docs/architecture/{decision-name}.md` covering: context, decision, alternatives considered, consequences

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
├── routes/                     TanStack Router route definitions
│   ├── __root.tsx              Root layout
│   ├── {-$locale}/
│   │   ├── index.tsx           Portfolio landing page (hosts the visitor AI chat dialog)
│   │   ├── about.tsx           Public profile page (bio, identity, skills, hobbies, contact)
│   │   ├── cv.tsx              Public CV (experience + education timelines)
│   │   ├── projects.tsx        Public portfolio (static list of Cem's projects)
│   │   ├── impressum.tsx       Imprint (TMG §5)
│   │   ├── datenschutz.tsx     Privacy notice (GDPR)
│   │   └── workspace/          Personal workspace hub + focus areas (noindex; Phase 2 OAuth-gated)
│   │       ├── index.tsx       Hub: greeting + assistant composer + links to each focus area
│   │       ├── assistant.$chatId.tsx  Deep-link view of one admin chat (`/workspace/assistant/<chatId>`) — bookmark-friendly, sidebar-independent
│   │       ├── compass.tsx     AI-built compass (summary / portrait / psychology) — see docs/features/workspace-compass.md
│   │       ├── cv.tsx          CV editor (writes the `Cv*` tables)
│   │       ├── software.tsx    Software development & architecture
│   │       ├── projects.tsx    Personal projects board (Inbox + kanban)
│   │       ├── projects_.$projectId.tsx  Per-project detail (tasks, activity, notes, links, files)
│   │       ├── todos.tsx       Standalone todos (tasks with no parent project)
│   │       ├── finances.tsx    Finances (goals, overview, trading & stocks)
│   │       ├── inventory.tsx   Inventory — material assets, warranty, valuations, service log
│   │       ├── inventory_.$itemId.tsx  Per-item detail (facts, valuations sparkline, service history, files)
│   │       ├── tax.tsx         Tax matters
│   │       ├── fitness.tsx     Fitness — gym log (sessions → sets), reusable routines, exercise catalog
│   │       ├── nutrition.tsx   Nutrition — cookbook, soft weekly meal plan, food/drink diary
│   │       ├── medical.tsx     Medical (appointments, results, health notes)
│   │       ├── media.tsx       Movies, series & channels — watchlist, series next-season tracking, favourite YouTube/podcast channels
│   │       ├── travel.tsx      Travel — trips list (upcoming / past) + new-trip dialog
│   │       ├── travel_.$tripId.tsx  Per-trip detail (itinerary: day cards + activities; packing list grouped by category)
│   │       └── logs.tsx        Server log viewer (read-only triage of the `Logs` table)
│   └── api/
│       ├── graphql.ts          POST /api/graphql (queries, mutations)
│       └── stream.ts           POST /api/stream (subscriptions via SSE)
├── server/
│   ├── agents/                 AI agents (visitor in Phase 1, +personal in Phase 2)
│   ├── commands/               Write operations (mutations)
│   ├── queries/                Read operations
│   ├── mappers/                DB-to-GraphQL transformations
│   ├── guards/                 Authorization guard functions
│   ├── db/
│   │   └── schema.ts           Drizzle table definitions
│   ├── domain/
│   │   ├── ServerRuntime.ts    DI container interface
│   │   └── serverRuntimeCreate.ts
│   ├── env/
│   │   ├── EnvironmentVariables.ts        EnvironmentVariables interface
│   │   └── environmentVariablesCreate.ts  Validates required env vars at startup
│   ├── graphql/
│   │   ├── schema.graphqls     SDL schema (source of truth)
│   │   ├── resolversCreate.ts  Resolver wiring (single entry point)
│   │   ├── extensions.ts       Union/interface __resolveType
│   │   ├── server.ts           Apollo Server setup
│   │   ├── PubSubPostgres.ts   PostgreSQL pub-sub
│   │   └── generated.ts        Generated types (DO NOT EDIT)
│   ├── jobs/
│   │   ├── boss.ts             pg-boss singleton + jobEnqueue
│   │   ├── index.ts            Worker registration, handler re-exports
│   │   ├── types.ts            Job type definitions
│   │   ├── jobDefinitions.ts   Central job registry
│   │   └── handlers/           Job handler implementations
│   └── utils/
├── web/
│   ├── components/
│   │   ├── base/               Radix/shadcn primitives
│   │   ├── CvTimeline.tsx      Shared timeline renderer (used on /cv)
│   │   └── CvSkillGroup.tsx    Skill block grouped by category (used on /about)
│   ├── content/
│   │   ├── personalInfo.ts     Static identity facts (DOB, nationality, contact)
│   │   └── portfolioProjects.ts  Static portfolio list (Phase 1; replaced by DB in Phase 3)
│   ├── graphql/
│   │   ├── client.ts           URQL client config
│   │   └── generated.ts        Generated types (DO NOT EDIT)
│   ├── hooks/                  Shared React hooks
│   ├── seo/
│   │   ├── seoMeta.ts          Per-page meta tag builder
│   │   └── sitemapRoutes.ts    Static path enumeration for /sitemap.xml
│   └── utils/
│       ├── cn.ts               Class name merging
│       └── locale.ts           DE / EN locale helpers
├── router.tsx
├── routeTree.gen.ts            Generated (DO NOT EDIT)
└── styles.css
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
