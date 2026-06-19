# Projects Page

## User Behavior

The public Projects page lives at `/projects` (`/en/projects` for the English locale). It lists the projects Cem currently wants to surface
on the portfolio, each as a single card containing:

- Brand name and tagline
- Role badge — `Gründungs-Architekt` / `Founding architect`, `Eigenes Projekt` / `Own project`, `Kundenprojekt` / `Client work`
- 1–2 sentence bilingual description
- Tech-stack chips (display-only labels, locale-independent)
- "Visit site" button — opens the live URL in a new tab with `rel="noopener noreferrer"`

The landing page (`/`) links into the page from its section grid; before this change that card rendered as a "coming soon" stub.

## Options Considered

| Approach                                                        | Why we picked / didn't                                                                                                                                      |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Wait for Phase 3** — DB-backed projects + `/workspace` editor | Phase 3 is two phases out (after OAuth + dual-agent chat). Visitors would keep seeing the "coming soon" stub for months. Rejected.                          |
| **DB-backed now**                                               | Three projects edited maybe twice a year doesn't justify a table, GraphQL types, mappers, an admin form, and migrations. Rejected.                          |
| **Static config under `src/web/content/`** (chosen)             | Mirrors `personalInfo.ts`. PR-edited, no runtime cost, works exactly the way the static-vs-DB split in `docs/architecture/content-model.md` says it should. |

## Option Chosen

Static content + plain route, replaced by Phase 3 when it lands.

- **Data**: `src/web/content/portfolioProjects.ts` — typed `ReadonlyArray<PortfolioProject>` with `id`, `name`, `url`, paired `*De` / `*En`
  text fields, and a `techStack` array. Imported directly by the route.
- **Route**: `src/routes/{-$locale}/projects.tsx` — single file, no GraphQL loader (the data is local). Bilingual copy follows the inline
  `{ de, en }[locale]` pattern used by `about.tsx` and `cv.tsx`.
- **SEO**: `seoMeta()` in `head()`; `/projects` listed in `src/web/seo/sitemapRoutes.ts` with `changefreq: 'monthly'` and `priority: 0.7`
  (same priority as `/about`).
- **Landing-page link**: the projects card on `/` now uses the existing `<NavCard>` component, with the `to` prop typed to include
  `'/{-$locale}/projects'` and a `FolderGitIcon` from `lucide-react`.

## Implementation Details

### Visual treatment

Each project card is a `<GlassCard>` matching the surface used by `/about` and the landing page. Tech-stack chips are styled inline (no new
primitive) — a translucent rounded pill that picks up the same border/background tokens the rest of the site uses.

### Bilingual copy

Page-level chrome (title, intro, role/tech-stack/visit labels) lives in the `COPY` constant at the top of `projects.tsx`. Per-project copy
lives in `portfolioProjects.ts` under paired `*De` / `*En` fields. The component picks the locale-appropriate string with `locale === 'de'`
ternaries, the same pattern the CV uses for hobby `textDe` / `textEn`.

### Why no detail pages

`/projects/$id` is reserved for Phase 3 (DB-backed projects). The current three projects don't have enough page-worthy content to justify
detail pages today; the "Visit site" button takes visitors directly to the live property.

## Open TODOs

- **Phase 3 migration**: when the `cvProjects`-style DB table and admin editor land at `/workspace/projects`, delete
  `src/web/content/portfolioProjects.ts` and switch the route to a GraphQL loader. The visual layout should survive the swap unchanged.
- **Per-project screenshots / og:images**: not shipped. If we want hero thumbnails before Phase 3, add an `imagePath` field to
  `PortfolioProject` and copy assets into `public/projects/`.
- **AI agent integration**: the visitor chat does not currently know about portfolio projects. When Phase 3 lands the DB table, extend
  `cvSummaryForAgent` (or a new `projectsSummaryForAgent`) so the agent can answer "what does Cem build?" deterministically.
