# Projects Page

## User Behavior

The public Projects page lives at `/projects` (`/en/projects` for the English locale). Each project renders as a **magazine-style spread**:
a hero image on top (capped at `max-w-3xl` and centered, so it doesn't stretch the full row width on desktop), a thin thumbnail strip below
it, then a two-column meta block — title / facts / description on the left and tech list / buttons on the right. On mobile the meta block
collapses to a single column. The layout deliberately trusts the screenshot to carry the row; copy is kept short so the image is the
dominant element.

A row contains:

- **Hero image** (16:9) plus a **thumbnail strip** below — clicking a thumb cross-fades the inline hero to the chosen shot. Clicking the
  hero itself opens a **lightbox dialog** that shows the active image in isolation on a dark overlay, with prev/next buttons, arrow-key
  navigation and a `1 / 3` position indicator. Inline hero and lightbox share `activeIndex` — closing the dialog leaves the inline gallery
  on whichever image the visitor last viewed. Software products (peopleeat, Draw Schema) get a faked browser-window chrome around the inline
  hero — three traffic-light dots, the hostname in a URL bar, the screenshot inside. Real-world businesses (the podiatry practice) get the
  photo edge-to-edge inside a `<GlassCard>`. Behind every inline hero sits a soft per-project accent glow that brightens on hover (the frame
  itself does not move — earlier iterations lifted it on hover, but the effect read as cheap). The "Visit site" button (not the hero click)
  takes visitors to the live URL.
- **Role / hostname strip** above the title — `Founding architect · people-eat.com`.
- **Project name** and, when set, a small row of **fact badges** (e.g. `4 languages`, `RTL support`, `EU-hosted`) — primary-tinted chips
  rendered between the title and the description.
- **Description** in DE or EN. 2–3 sentences. Holds positioning, not feature list — the distinctive points are folded in here rather than
  surfaced as a separate bullet list (an earlier iteration tried that; the page became too dense).
- **Tech line** — a wrapping row of subtle chips listing the project's stack, in the order defined in `portfolioProjects.ts`. Low-contrast
  (translucent border, muted text) so the row reads as meta-information rather than as a feature list. An earlier iteration tried a flat
  dot-separated `text-muted-foreground` line; chips ended up reading more confidently because each item gets its own shape and the eye
  groups them as a coherent stack. Predecessor to both was a labelled Frontend/Backend/Integrations grouped layout, which read as a CV table
  and wrapped awkwardly in a narrow column.
- **Primary "Visit site" button** linking to the live URL (`target="_blank" rel="noopener noreferrer"`).
- **Secondary "View source" button** rendered only when `repoUrl` is set (currently Draw Schema, since it's open source).

Rows fade up as they scroll into view. `prefers-reduced-motion` users skip every transition (fade-in, gallery cross-fade, glow brighten).

Below the project rows the page closes with a **chat call-to-action** that mirrors the landing-page CTA — an availability badge that
advances by month, a primary "Request a project" button and a secondary "Book an intro call" button that both seed the visitor chat dialog,
plus a `mailto:` fallback link. The buttons go through `useVisitorChat().openWithMessage()`; the dialog itself is mounted once at
`__root.tsx`, so this page doesn't render it.

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
  paired `*De` / `*En` text fields, an optional `facts: string[]` array of chip-sized tags, a flat ordered `techStack: string[]`
  (most-distinctive items first, rendered in order), and the visual fields (`images: ReadonlyArray<{ src; altDe; altEn }>`, `imageKind`,
  `accent`). The first entry of `images` is the hero; subsequent entries fill the thumbnail strip. Imported directly by the route.
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
behind the frame, it reads as a soft glow that brightens on hover (`opacity-50 → opacity-90`). The frame itself stays put — an earlier
iteration also lifted the frame via `translate-y` on hover, but it read as cheap. All transitions are skipped under
`prefers-reduced-motion`.

Per-project accent colors are defined as raw `oklch(...)` strings in `portfolioProjects.ts`:

- peopleeat — warm orange (`oklch(0.78 0.16 55)`)
- Draw Schema — cool slate-blue (`oklch(0.7 0.13 240)`)
- Podologie Dudenhofen — calm green-teal (`oklch(0.75 0.1 165)`)

### Fact badges and tech line

Two small components surface project meta in the meta block:

- **`FactBadges`** renders short chips (`'4 languages'`, `'EU-hosted'`, `'Live since 2022'`) right under the title. Tinted with the primary
  colour so they pop without competing with the tech line. Skipped silently when `facts` is empty or absent.
- **`TechStack`** renders the flat ordered `techStack` array as a wrapping row of subtle chips — translucent border, `text-foreground/80`,
  no fill colour beyond a faint white surface. Each item is a `<li>` so screen readers hear it as a list. Two earlier iterations are gone: a
  Frontend/Backend/Integrations grouped chip layout (read as a CV table, wrapped awkwardly in a narrow column) and a flat dot-separated text
  line (read as too quiet — chips give each item its own shape and the eye groups them as a coherent stack).

There is intentionally no highlights bullet list. A prior iteration had one; combined with the description and the grouped tech rows the
page felt cluttered. The strongest 1–2 points from those highlights are now folded into the description prose instead.

### Lightbox

Clicking an inline hero opens `<ProjectLightbox />` — a Radix `Dialog` that renders the active image on a dark, mostly-transparent backdrop
with the chrome stripped. The dialog content has no border, padding, or close button; the image speaks for itself. Prev/next floating
buttons live on the left and right edges (only when `images.length > 1`); the dialog also listens for `ArrowLeft` / `ArrowRight` on `window`
while open. A `1 / 3`-style position indicator sits below the image. Wraps at both ends. Single-image projects open the dialog too but
render no controls — the screenshot just gets a larger viewport.

The inline gallery and the lightbox share `activeIndex` (held in `<ProjectGallery />`), so the inline hero is in sync when the dialog
closes. The lightbox does its own `object-contain` render at `max-h-[80vh]` and a dialog `max-w-[min(96vw,84rem)]` so portrait-leaning shots
and wide screenshots both fit without cropping.

`DialogTitle` and `DialogDescription` are rendered as `sr-only` (set to the project name and the active image's alt text) so screen-reader
users hear meaningful labels for the dialog without those labels showing visually.

### Call-to-action

After the last project row, `<CallToAction />` mirrors the landing-page CTA structurally so the two pages feel like one journey:

- An availability badge that reads "Currently capacity for 1 project from {month}" / "Aktuell Kapazität für 1 Projekt ab {month}", where
  `{month}` is the month one calendar month from today, formatted by `Intl.DateTimeFormat` in the page's locale. Replicated locally rather
  than extracted — landing and projects pages share copy intent but not enough surface to justify a shared component yet.
- A primary "Request a project" button and a secondary "Book an intro call" button. Both call
  `useVisitorChat().openWithMessage(seed[locale])` with a localised seed string, which opens the global visitor chat dialog (mounted at
  `__root.tsx`) with that question pre-filled as the first user turn.
- A `mailto:` fallback link below the buttons, rendered only when `personalInfo.contact.emails[0]` is non-empty.

Each project row owns a small `<ProjectGallery>` that holds the hero plus a thumbnail strip below it. State (`activeIndex`) lives in the
gallery component so each project's gallery is independent. The hero stacks every image absolutely and toggles `opacity` for a 500ms
cross-fade between thumbs. The first image renders `relative` so the hero gets a real size from CSS; subsequent images sit
`absolute inset-0`.

Single-image projects render only the hero — the strip is gated on `images.length > 1`. The strip is horizontally scrollable on small
screens and uses `aria-current="true"` on the active thumb. Buttons carry the locale-appropriate alt text as `aria-label`; the thumb image
itself is `aria-hidden`, so screen readers hear one label per thumb, not two.

### Bilingual copy

Page chrome (title, intro, button labels) lives in the `COPY` constant at the top of `projects.tsx`. Per-project copy and image alt text
live in `portfolioProjects.ts` under paired `*De` / `*En` fields. The component picks the locale-appropriate string with `locale === 'de'`
ternaries.

### Why no detail pages

`/projects/$id` is reserved for Phase 3 (DB-backed projects). The current three projects don't have enough page-worthy content to justify
detail pages today; the "Visit site" button takes visitors directly to the live property.

### Hero images

Hero images live under `public/projects/<id>/`. There are three sources:

1. **Live capture** — the script `scripts/captureProjectScreenshots.ts` uses Playwright Chromium to grab `1600×900` screenshots. Run with
   `npx tsx scripts/captureProjectScreenshots.ts` whenever a target site's design changes. Currently captures four routes for `peopleeat`
   (`/`, `/chefs`, `/about-us`, `/cities/Berlin`) and the `/landing` page of `draw-schema`.
2. **Curated from sibling repo** — `Draw Schema` ships a polished 16:9 product shot in its own `public/16-9.png` and an empty-canvas shot in
   `public/empty-canvas-16-9.png`. Both copied by hand into `public/projects/draw-schema/` and flagged `manualOnly: true` in the capture
   script so they aren't overwritten.
3. **Photo from sibling repo** — `Podologie Dudenhofen` reuses two photos from the practice's own `public/`: the treatment-room shot and a
   portrait of the owner Annette Yilmaz. Honest, on-brand, and doesn't depend on the live site being reachable from the build host.

### Scroll-in animation

Each row is wrapped in the shared [`Reveal`](../../src/web/components/Reveal.tsx) component, which uses the shared `useInView` hook to fade
and lift the row up when it scrolls into view. Server output starts with `opacity-0`; the hook only mounts client-side, and
`prefers-reduced-motion` users render the row at its final state without animation. See [docs/styles/motion.md](../styles/motion.md) for the
broader motion guardrails this honours.

## Open TODOs

- **Phase 3 migration**: when the `cvProjects`-style DB table and admin editor land at `/workspace/projects`, delete
  `src/web/content/portfolioProjects.ts` and switch the route to a GraphQL loader. The visual layout should survive the swap unchanged.
- **AI agent integration**: the visitor chat does not currently know about portfolio projects. When Phase 3 lands the DB table, extend
  `cvSummaryForAgent` (or a new `projectsSummaryForAgent`) so the agent can answer "what does Cem build?" deterministically.
- **Re-capture podologie when the firewall lifts**: the `manualOnly` flag is a workaround, not the desired end state.
- **Lightbox**: clicking a thumb currently swaps the hero in place. Could be promoted to a fullscreen lightbox if the strip grows past ~5
  images per project.
