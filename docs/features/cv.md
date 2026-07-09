# CV (Lebenslauf) Pages

## User Behavior

Two visitor-facing pages plus one admin surface, all bilingual:

- **`/about` (`/en/about`)** — Profile page. Shows the bio paragraph, identity facts (DOB, residence, nationality, spoken languages), the
  full skill block grouped by category, hobbies, and contact channels (email, GitHub, LinkedIn). Footer CTA links to `/cv`.
- **`/cv` (`/en/cv`)** — Full CV. A hero strip (title, intro, computed stat row: `N+ years · N stations · location`, "Download PDF" CTA
  pulled to the right on desktop), then two rail-style timelines (experience and education). Each entry's date range sits to the **left of
  the rail** on `md+` (`heute`/`today` for ongoing roles); a brand-tinted dot marks ongoing entries and a muted dot marks past ones. The
  GlassCard on the right carries role + company, description, technology chips, and an optional manager line. Each card fades + lifts in on
  its own as it scrolls into view (`Reveal` per entry, 70ms stagger capped at 3 steps). The PDF CTA points at `/Lebenslauf.pdf` (the
  original document, served from `public/`).
- **`/workspace/cv`** — Admin editor. Add/edit/delete forms for every CV entity. `noindex`, unlinked from the public site, mutations gated
  by `guardAdminMutation` — the workspace surface is gated on the `isAdmin` flag on the requesting session's `Users` row.

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

Each table follows the same shape: a uuid PK, paired `*De` / `*En` text columns for bilingual fields, plus `createdAt` / `updatedAt`
timestamps. Education, skills, and hobbies carry a `position INT` column the editor writes via their matching reorder mutation; experience
is the exception — see its bullet below. Specifics:

- `cvExperience` — `startDate` is required, `endDate` is nullable (null = ongoing, rendered as `heute` / `today`). `technologies` is a
  Postgres `text[]` because the labels are display chips, never queried by relation. `managerName` is a single varchar (the PDF can list
  more than one — the column accepts comma-separated text). **No `position` column**: experience is intrinsically chronological, so
  `publicCvExperienceFindMany` orders rows by `endDate DESC NULLS FIRST, startDate DESC` and the editor has no drag handles.
- `cvEducation` — `endDate` is required, `startDate` is nullable (Abitur and similar entries only carry an end date).
  `subjectDe`/`subjectEn` default to the empty string so non-degree entries are valid without a sentinel. `notesDe`/`notesEn` carry
  free-form text — the renderer preserves newlines.
- `cvSkill` — `category` is a flat enum (`capabilities | frameworks | services | tools | languages`) stored as varchar; the GraphQL schema
  mirrors it as `enum CvSkillCategory`. Skill labels are not translated (TypeScript reads the same in both locales), so there is one `label`
  column rather than the `*De` / `*En` pair.
- `cvHobby` — `since` is a nullable integer year for entries like "Seit 2011 Karate"; entries without a year ("Tennis, Volleyball, ...")
  simply omit it.

### GraphQL

Read namespace: `Query.publicCvFindOne: CvQuery!` with four lists (`publicCvExperienceFindMany`, `publicCvEducationFindMany`,
`publicCvSkillFindMany`, `publicCvHobbyFindMany`). Reads are public — visitors hit them on `/cv` and `/about` directly.

Write namespace: 11 mutations on `AdminMutation` (`cv*Upsert`, `cv*Delete`, `cv{Education,Skill,Hobby}Reorder` — experience has no reorder
mutation; it's sorted by date). The whole `Mutation.admin` is gated by `guardAdminMutation`, so each entity inherits the gate without a
parallel guard.

The bilingual columns surface as paired `*De` / `*En` GraphQL fields. The client picks per-locale at render time — same model as the inline
`{ de, en }[locale]` copy pattern in `docs/architecture/i18n.md`. A single locale-aware `text` field would lock the schema to one locale per
request and complicate the admin editor (which needs both languages on screen at once); paired fields keep the editor simple.

### Server CQRS layer

Mirroring the existing `chat*` files exactly:

- `src/server/queries/publicCv{Experience,Education,Skill,Hobby}FindMany.ts` — `SELECT … ORDER BY position ASC`, except
  `publicCvExperienceFindMany`, which sorts by `endDate DESC NULLS FIRST, startDate DESC`.
- `src/server/commands/cv{Experience,Education,Skill,Hobby}Upsert.ts` — two-phase per `docs/conventions.md` "Commands". Null `cv*Id` →
  insert; populated id → update.
- `src/server/commands/cv{Experience,Education,Skill,Hobby}Delete.ts` — single-statement delete, throws on miss.
- `src/server/commands/cv{Education,Skill,Hobby}Reorder.ts` — bulk position-rewrite over `orderedIds[]`, wrapped in a transaction so a
  partial write can't leave the list with duplicate positions. Experience has no reorder command.
- `src/server/mappers/toGqlCv{Experience,Education,Skill,Hobby}.ts` — straight passthrough (no field renaming).

All wired in `src/server/graphql/resolversCreate.ts` alongside the existing chat resolvers.

### Public pages

`/cv` uses a shared presentational component, `src/web/components/CvTimeline.tsx`. The component is locale-aware (date formatting via
`Intl.DateTimeFormat`) but knows nothing about GraphQL — the route maps DB rows into the component's `CvTimelineEntry` shape, which keeps
the same component reusable for both experience and education. `endDate === null` is rendered as the `ongoingLabel` (`heute` / `today`).

The timeline layout is a two-column CSS grid on `md+`: a fixed 7rem "date" column on the left, then a 1px vertical rail with a dot per
entry, then the GlassCard. Ongoing entries (`endDate === null`) get a fully-saturated `bg-primary` dot ringed by `ring-background` so it
reads as inset on the rail; past entries get a muted `bg-muted-foreground/40` dot. Each entry is wrapped in `<Reveal as="li" index={i}>` so
cards fade in individually as the viewport reaches them — wrapping the whole section in a single `Reveal` would not fire until the user had
already scrolled past the heading (the section is taller than the viewport, so the 15% intersection threshold misses the top). On mobile the
rail collapses and the date renders as a small inline label above the card title.

Header stats (`N+ years`, `N stations`) are computed at render time from the same loader data the timelines consume, so the strip never
drifts from the entries themselves.

`/about` uses `CvSkillGroup` (also in `src/web/components/`), which groups skills by category and skips empty buckets so a future deletion
doesn't leave a hollow header.

### Admin editor

`/workspace/cv` is a single React component split by section. Each section has its own list and a single inline form (one editor open at a
time). On save the page issues the matching `cv*Upsert` mutation through URQL and re-fetches the read query with
`requestPolicy: 'network-only'`.

Date fields use the shared `DatePicker` (`src/web/components/base/date-picker.tsx`) with `captionLayout="dropdown"` so the year and month
become selectors rather than one-step arrows — CV entries routinely sit decades back, and one click per month is not navigation. The form
keeps the GraphQL wire shape (ISO `YYYY-MM-DD` strings) as its storage type and adapts at the picker boundary via `date-fns` `parseISO` /
`format`; a thin `DateField` wrapper in the editor handles the conversion and mirrors the value into a hidden input so native HTML5
`required` validation still fires (the picker itself is a popover trigger button, not a form control).

Reordering uses a vertical drag-and-drop gesture on education, skills, and hobbies: every row carries a `GripVertical` handle on its leading
edge, the user drags the row into its new slot, and on drop the editor commits the new order via the matching `cv*Reorder` mutation (which
rewrites every row's `position` from a single id list). The on-screen list updates optimistically the instant the drop fires; the admin read
query then re-fetches with `network-only` so `/cv` and `/about` see the new order on their next request. Drag is implemented with the
platform's native HTML5 drag-and-drop API (no library); a `useReorderableList` hook owns the optimistic state and is reused across those
three sections. Reordering is scoped per list — for skills, drag is scoped within a single category (cross-category moves are done by
editing the row's category field).

The experience section has no drag handles — rows are sorted by `endDate` (ongoing first), then `startDate`, both descending. Editing a
row's `endDate` and saving moves it to its new slot automatically via the `userUpdates` subscription push.

The skills list itself is rendered grouped by category — same `SKILL_CATEGORIES` order and same `SKILL_CATEGORY_LABELS` used by the public
`CvSkillGroup` component — so the editor view mirrors the visitor-side `/about` layout, and each category drags independently.

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
- A `toolCvSearch` agent tool — the embedded summary covers visitor questions for the current row count.
- Profile photo asset and avatar surfacing on `/about`.
- Phase 2 admin OAuth wiring — the editor is reachable today for any session whose `Users.isAdmin` flag is set; OAuth reconciles the flag
  automatically from `WORKSPACE_GITHUB_LOGINS` once it lands.
