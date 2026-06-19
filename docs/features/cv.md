# CV (Lebenslauf) Pages

## User Behavior

Two visitor-facing pages plus one admin surface, all bilingual:

- **`/about` (`/en/about`)** — Profile page. Shows the bio paragraph, identity facts (DOB, residence, nationality, spoken languages), the
  full skill block grouped by category, hobbies, and contact channels (email, GitHub, LinkedIn). Footer CTA links to `/cv`.
- **`/cv` (`/en/cv`)** — Full CV. Hero, then two timelines (experience and education). Each entry shows a date range (`heute`/`today` for
  ongoing roles), role + company, description, technology chips, and an optional manager line. A "Download PDF" link in the hero points at
  `/Lebenslauf.pdf` (the original document, served from `public/`).
- **`/workspace/cv`** — Admin editor. Add/edit/delete forms for every CV entity. `noindex`, unlinked from the public site, mutations gated
  by `guardAdminMutation` (permissive in Phase 1, real OAuth in Phase 2).

The visitor AI chat ("Frag mich was") answers CV questions by reading the same DB rows — see "AI agent integration" below.

## Options Considered

| Approach                                                       | Why we picked / didn't                                                                                                              |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Static config files** (single `cv.ts` checked into the repo) | Editing means a PR + redeploy. Defeats the user's existing `/workspace` editing surface. Used only for stable identity (see below). |
| **Markdown files** (one `.md` per role)                        | Same redeploy friction. Also harder to query structurally for the AI agent.                                                         |
| **Headless CMS** (Sanity/Contentful)                           | Extra service, extra auth, content lives outside the repo. Overkill for a single-author site.                                       |
| **DB tables, edited from `/workspace`** (chosen)               | Matches Phase 3's projects/tools/blog approach. Editing is 30 seconds. AI agent gets structured rows for free.                      |

## Option Chosen

DB-backed editable timeline + static identity config.

- **DB**: `cvExperience`, `cvEducation`, `cvSkill`, `cvHobby` — see `src/server/db/schema.ts`.
- **Static**: `src/web/content/personalInfo.ts` — name, DOB, contact, public-visibility flags. Lives under `web/` because it's pure data
  read by both the server (`cvSummaryForAgent`) and the client (`/about`).

## Implementation Details

### Database schema

Each table follows the same shape: a uuid PK, paired `*De` / `*En` text columns for bilingual fields, a `position INT` column the editor
writes via the reorder mutation, plus `createdAt` / `updatedAt` timestamps. Specifics:

- `cvExperience` — `startDate` is required, `endDate` is nullable (null = ongoing, rendered as `heute` / `today`). `technologies` is a
  Postgres `text[]` because the labels are display chips, never queried by relation. `managerName` is a single varchar (the PDF can list
  more than one — the column accepts comma-separated text).
- `cvEducation` — `endDate` is required, `startDate` is nullable (Abitur and similar entries only carry an end date).
  `subjectDe`/`subjectEn` default to the empty string so non-degree entries are valid without a sentinel. `notesDe`/`notesEn` carry
  free-form text — the renderer preserves newlines.
- `cvSkill` — `category` is a flat enum (`capabilities | frameworks | services | tools | languages`) stored as varchar; the GraphQL schema
  mirrors it as `enum CvSkillCategory`. Skill labels are not translated (TypeScript reads the same in both locales), so there is one `label`
  column rather than the `*De` / `*En` pair.
- `cvHobby` — `since` is a nullable integer year for entries like "Seit 2011 Karate"; entries without a year ("Tennis, Volleyball, ...")
  simply omit it.

### GraphQL

Read namespace: `Query.cv: CvQuery!` with four lists (`experience`, `education`, `skills`, `hobbies`). Reads are public — visitors hit them
on `/cv` and `/about` directly.

Write namespace: 12 mutations on `AdminMutation` (`cv*Upsert`, `cv*Delete`, `cv*Reorder`). The whole `Mutation.admin` is gated by
`guardAdminMutation`, so each entity inherits the gate without a parallel guard.

The bilingual columns surface as paired `*De` / `*En` GraphQL fields. The client picks per-locale at render time — same model as the inline
`{ de, en }[locale]` copy pattern in `docs/architecture/i18n.md`. A single locale-aware `text` field would lock the schema to one locale per
request and complicate the admin editor (which needs both languages on screen at once); paired fields keep the editor simple.

### Server CQRS layer

Mirroring the existing `chat*` files exactly:

- `src/server/queries/cv{Experience,Education,Skill,Hobby}List.ts` — `SELECT … ORDER BY position ASC`.
- `src/server/commands/cv{Experience,Education,Skill,Hobby}Upsert.ts` — two-phase per `docs/conventions.md` "Commands". Null `cv*Id` →
  insert; populated id → update.
- `src/server/commands/cv{Experience,Education,Skill,Hobby}Delete.ts` — single-statement delete, throws on miss.
- `src/server/commands/cv{Experience,Education,Skill,Hobby}Reorder.ts` — bulk position-rewrite over `orderedIds[]`, wrapped in a transaction
  so a partial write can't leave the list with duplicate positions.
- `src/server/mappers/toGqlCv{Experience,Education,Skill,Hobby}.ts` — straight passthrough (no field renaming).

All wired in `src/server/graphql/resolversCreate.ts` alongside the existing chat resolvers.

### Public pages

`/cv` uses a shared presentational component, `src/web/components/CvTimeline.tsx`. The component is locale-aware (date formatting via
`Intl.DateTimeFormat`) but knows nothing about GraphQL — the route maps DB rows into the component's `CvTimelineEntry` shape, which keeps
the same component reusable for both experience and education. `endDate === null` is rendered as the `ongoingLabel` (`heute` / `today`).

`/about` uses `CvSkillGroup` (also in `src/web/components/`), which groups skills by category and skips empty buckets so a future deletion
doesn't leave a hollow header.

### Admin editor

`/workspace/cv` is a single React component split by section. Each section has its own list and a single inline form (one editor open at a
time). On save the page issues the matching `cv*Upsert` mutation through URQL and re-fetches the read query with
`requestPolicy: 'network-only'`.

Reordering today is done by typing a `position` integer directly into the form. The `cv*Reorder` mutations are wired but a drag-handle UI is
deferred to a follow-up; one-line copy edits to position numbers are good enough for the hand-curated list this CV is.

### Sitemap

`/about` and `/cv` are added to `SITEMAP_PATHS` in `src/web/seo/sitemapRoutes.ts` (priority 0.7 and 0.8 respectively). The workspace editor
is `noindex` and stays out of the sitemap.

### AI agent integration

`src/server/agents/cvSummaryForAgent.ts` queries the four CV tables and renders a compact German markdown summary. The summary is
re-rendered on every visitor chat turn (cheap — four indexed selects), then embedded into the system prompt for `agentVisitorAboutCem`. This
is the deliberately-simple path; a `toolCvSearch` tool is conceivable but unnecessary for the current row count.

### Identity facts (static)

`src/web/content/personalInfo.ts` exports a typed `PersonalInfo` record covering name, DOB, place of birth, nationality, residence, contact
channels, and per-channel `publicVisibility` flags. Phone is hidden by default — `/impressum` is the legal surface for it, not `/about`.
Phase 2 may move `/impressum` to read from this same file; today it still uses its own placeholder.

## Seeding

Initial bootstrap: `npx tsx scripts/seedCv.ts` reads the PDF contents (committed in the script as inline data) and writes 11 experience, 2
education, 74 skill, and 4 hobby rows. The script is idempotent — it deletes the four tables before re-inserting. After the bootstrap, the
admin editor is the only edit path.

## Out of scope (deferred)

- `/cv.pdf` server-rendered download via `serverRuntime.browser.capture()` — the existing `Lebenslauf.pdf` covers it for now.
- Drag-handle UI for reordering — the `cv*Reorder` mutations are wired and tested; only the UI is missing.
- A `toolCvSearch` agent tool — the embedded summary covers visitor questions for the current row count.
- Profile photo asset and avatar surfacing on `/about`.
- Phase 2 admin OAuth wiring — the editor is reachable today; mutations will start refusing once `guardAdminMutation` flips on.
