# cem-yilmaz.de

Cem Yilmaz's portfolio + personal workspace, hosted at <https://cem-yilmaz.de>.

The public side is a portfolio (about, CV, projects) plus a visitor AI chat that answers questions about Cem and lets visitors submit
OTP-verified project requests. The private side (`/workspace`, gated by session `userId` + `Users.isAdmin`) is the admin platform: AI
assistant, content editors, and focus areas (projects, media, fitness, finances, and more).

**Stack:** TanStack Start + React 19 · Apollo Server v5 + URQL (SDL-first GraphQL) · Drizzle ORM + PostgreSQL · graphql-sse (SSE) +
PostgreSQL NOTIFY/LISTEN · pg-boss · Vercel AI SDK + Google Gemini · Tailwind 4 + shadcn/Radix · Vitest + Playwright · Storybook · Docker
via Coolify.

> **For Claude / coding agents:** the project's working agreement is in [`AGENTS.md`](./AGENTS.md) (and [`CLAUDE.md`](./CLAUDE.md), which is
> a symlink to it). The full architecture lives under [`docs/`](./docs/). **Read the docs before writing code; update the docs after.**

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
- **Production** values are configured in Coolify, not in any `.env*` file. The example files exist for local dev only. In production,
  `WEB_PAGE_URL` must be `https://cem-yilmaz.de`.
- **Capability vars** are optional in the type but required when their feature runs: `GOOGLE_GENERATIVE_AI_API_KEY` (chat),
  `SERVER_TOKEN_SECRET` (server-side rendering), and `RESEND_API_KEY` + `EMAIL_FROM_ADDRESS` (visitor chat email tools — see
  [`docs/features/chat-email-tools.md`](./docs/features/chat-email-tools.md)).

---

## Project Surfaces

| Surface                            | Auth                                                     |
| ---------------------------------- | -------------------------------------------------------- |
| `/` — landing (incl. visitor chat) | Public                                                   |
| `/about`, `/cv`, `/projects`       | Public                                                   |
| `/impressum`, `/datenschutz`       | Public                                                   |
| `/workspace` — hub + focus areas   | Session `userId` with `Users.isAdmin`; noindex, unlinked |
| `/workspace/assistant/<chatId>`    | Session `userId` with `Users.isAdmin`; noindex, unlinked |

Focus-area routes under `/workspace/*` (projects, media, fitness, finances, travel, …) share the same admin gate. See `docs/features/` for
each surface.

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

## Documentation Map

| Read first                                           | When                                                                   |
| ---------------------------------------------------- | ---------------------------------------------------------------------- |
| [`docs/conventions.md`](./docs/conventions.md)       | Always. Naming, two-phase commands, generated files, testing patterns. |
| [`docs/documentation.md`](./docs/documentation.md)   | Before adding a doc — so you put it in the right place.                |
| [`docs/infrastructure.md`](./docs/infrastructure.md) | Touching deploy, CI, Dockerfile, env vars.                             |
| `docs/architecture/*.md`                             | Working in that area (api-layer, jobs, chat, auth, file-storage, …).   |
| `docs/features/*.md`                                 | Working on a shipped feature (portfolio, chat, workspace areas, …).    |

---

## License

All rights reserved. No `LICENSE` file is shipped, and none is intended — the code in this repository is not open source. You may view and
fork it through GitHub's interface (as GitHub's terms allow), but you may not copy, modify, redistribute, or use it in any other way without
explicit written permission from Cem Yilmaz.
