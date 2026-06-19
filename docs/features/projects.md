# Projects Page

## User Behavior

The public Projects page lives at `/projects` (`/en/projects` for the English locale). Each project renders as a wide **feature row** that
alternates image-left / image-right down the page, and collapses to image-on-top on mobile. A row contains:

- **Hero image** (16:9). Software products (peopleeat, Draw Schema) get a faked browser-window chrome — three traffic-light dots, the
  hostname in a URL bar, the screenshot inside. Real-world businesses (the podiatry practice) get the photo edge-to-edge inside a
  `<GlassCard>`. The image is wrapped in a link to the live site and lifts on hover behind a soft per-project accent glow.
- **Role / hostname strip** above the title — `Founding architect · people-eat.com`.
- **Project name, tagline, description** in DE or EN.
- **Tech-stack chips** — display-only labels.
- **Primary "Visit site" button** linking to the live URL (`target="_blank" rel="noopener noreferrer"`).
- **Secondary "View source" button** rendered only when `repoUrl` is set (currently Draw Schema, since it's open source).

Rows fade up as they scroll into view. `prefers-reduced-motion` users skip the animation entirely.

The landing page (`/`) links into the page from its section grid; before this change that card rendered as a "coming soon" stub.

## Options Considered

| Approach                                                        | Why we picked / didn't                                                                                                                                      |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Wait for Phase 3** — DB-backed projects + `/workspace` editor | Phase 3 is two phases out (after OAuth + dual-agent chat). Visitors would keep seeing the "coming soon" stub for months. Rejected.                          |
| **DB-backed now**                                               | Three projects edited maybe twice a year doesn't justify a table, GraphQL types, mappers, an admin form, and migrations. Rejected.                          |
| **Static config under `src/web/content/`** (chosen)             | Mirrors `personalInfo.ts`. PR-edited, no runtime cost, works exactly the way the static-vs-DB split in `docs/architecture/content-model.md` says it should. |

## Option Chosen

Static content + plain route, replaced by Phase 3 when it lands.

- **Data**: `src/web/content/portfolioProjects.ts` — typed `ReadonlyArray<PortfolioProject>` with `id`, `name`, `url`, optional `repoUrl`,
  paired `*De` / `*En` text fields, a `techStack` array, and the visual fields (`imagePath`, `imageKind`, `imageAlt*`, `accent`). Imported
  directly by the route.
- **Route**: `src/routes/{-$locale}/projects.tsx` — single file, no GraphQL loader. Bilingual copy follows the inline `{ de, en }[locale]`
  pattern used by `about.tsx` and `cv.tsx`.
- **SEO**: `seoMeta()` in `head()`; `/projects` listed in `src/web/seo/sitemapRoutes.ts`.
- **Landing-page link**: the projects card on `/` uses the existing `<NavCard>` linking to `/projects`.

## Implementation Details

### Visual treatment

Two image kinds, set per-project via `imageKind`:

- **`'browser'`** — software products. The image sits inside an inline `<BrowserFrame>` component (defined in the route file), which fakes
  macOS browser chrome with three traffic-light circles and a centered hostname pill. Same translucent border / blur / shadow tokens as
  `<GlassCard>` so it reads as part of the same visual family.
- **`'photo'`** — real-world businesses. The image sits edge-to-edge inside a regular `<GlassCard>`. Cropped to 16:9 with `object-cover`.

Behind every image, an absolutely-positioned `<div>` paints a `radial-gradient` using the project's `accent` color. Blurred and offset
behind the frame, it reads as a soft glow. The glow expands and intensifies on hover, while the frame itself lifts via `translate-y`. All
transitions are skipped under `prefers-reduced-motion`.

Per-project accent colors are defined as raw `oklch(...)` strings in `portfolioProjects.ts`:

- peopleeat — warm orange (`oklch(0.78 0.16 55)`)
- Draw Schema — cool slate-blue (`oklch(0.7 0.13 240)`)
- Podologie Dudenhofen — calm green-teal (`oklch(0.75 0.1 165)`)

### Bilingual copy

Page chrome (title, intro, button labels) lives in the `COPY` constant at the top of `projects.tsx`. Per-project copy and image alt text
live in `portfolioProjects.ts` under paired `*De` / `*En` fields. The component picks the locale-appropriate string with `locale === 'de'`
ternaries.

### Why no detail pages

`/projects/$id` is reserved for Phase 3 (DB-backed projects). The current three projects don't have enough page-worthy content to justify
detail pages today; the "Visit site" button takes visitors directly to the live property.

### Hero images

Hero images live under `public/projects/<id>/`. There are three sources:

1. **Live capture** — the script `scripts/captureProjectScreenshots.ts` uses Playwright Chromium to grab `1600×900` screenshots at
   `deviceScaleFactor: 2`. Run with `npx tsx scripts/captureProjectScreenshots.ts` whenever a target site's design changes. Currently used
   for `peopleeat` only (the live captures of `podologie-dudenhofen.de` are blocked from this network with a TLS reset).
2. **Curated from sibling repo** — `Draw Schema` ships a polished 16:9 product shot in its own `public/16-9.png`. Copied by hand into
   `public/projects/draw-schema/1.png` and flagged `manualOnly: true` in the capture script so it isn't overwritten.
3. **Photo from sibling repo** — `Podologie Dudenhofen` reuses the practice photo from its own `public/podologie-dudenhofen-praxis.jpg`,
   copied to `public/projects/podologie-dudenhofen/1.jpg`. Honest, on-brand, doesn't depend on the live site being reachable.

### Scroll-in animation

A small `useFadeInOnScroll()` hook (defined in `projects.tsx`) wires an `IntersectionObserver` to each row. The observer fires once, sets a
`shown` flag, then disconnects. The row's `opacity` and `translate-y` classes flip via the `cn()` helper. SSR-safe: server output starts
with `opacity-0`; the hook only mounts client-side. `prefers-reduced-motion` users get `shown: true` immediately, so they never see the
hidden state.

## Open TODOs

- **Phase 3 migration**: when the `cvProjects`-style DB table and admin editor land at `/workspace/projects`, delete
  `src/web/content/portfolioProjects.ts` and switch the route to a GraphQL loader. The visual layout should survive the swap unchanged.
- **AI agent integration**: the visitor chat does not currently know about portfolio projects. When Phase 3 lands the DB table, extend
  `cvSummaryForAgent` (or a new `projectsSummaryForAgent`) so the agent can answer "what does Cem build?" deterministically.
- **Multiple images per project**: `imagePath` is a single string today. If a project warrants a small thumb strip below the hero, switch to
  `images: ReadonlyArray<{ src; altDe; altEn }>` and render with scroll-snap.
- **Re-capture podologie when the firewall lifts**: the `manualOnly` flag is a workaround, not the desired end state.
