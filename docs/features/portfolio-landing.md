# Portfolio Landing Page

## User Behavior

The root URL (`/` for German visitors, `/en` for English) shows the public landing page for Cem Yilmaz's site. It's the entry point for
everyone who isn't going through a deep-link.

The page contains:

- **Header** — site name (links back to `/`) and the bilingual `LanguageSelector`.
- **Hero** — Cem's name, a short tagline, and a one-paragraph intro.
- **Section grid** — four cards for Projects, Blog, Web tools, and the visitor AI chat. The first three render as "coming soon" (they are
  unimplemented stubs in Phase 1) and the chat card is a real link to `/chat`.
- **Footer** — Contact links (GitHub, LinkedIn, email) plus legal links to `/impressum` and `/datenschutz`.

## Implementation Details

### File

`src/routes/{-$locale}/index.tsx` is the single source of truth. There is no companion `.graphql` file beyond the existing
`HomePage.graphql` query (which keeps the route's session loader wired so `currentSession` is available if a future revision needs it).

### Bilingual copy

All visitor-facing text lives in a single `COPY` constant at the top of the route file, keyed by section. Each entry is
`{ de: string; en: string }` and is read with `entry[locale]`. **Do not** introduce a translation library — see
[`docs/architecture/i18n.md`](../architecture/i18n.md).

### SEO

`head()` calls `seoMeta()` with the locale-appropriate `title` and `description`. The page is listed in `src/web/seo/sitemapRoutes.ts` as
`path: '/'` with weekly `changefreq` and priority `1.0`.

### Section cards

Three of the four cards (`Projects`, `Blog`, `Web tools`) use `<ComingSoonCard>`, a thin styled wrapper around the existing
`<Card>`/`<CardContent>` primitives. They render greyed-out and have no `href`. They become real links when Phase 3 lands the corresponding
content.

The fourth card (`<ChatCard>`) is a real `<Link to="/{-$locale}/chat" />` that takes the visitor into the existing `/chat` surface.

### Social-link footer

Defined as `SOCIAL_LINKS` (a `ReadonlyArray` of `{ href, label, icon }`). The hrefs are **placeholders** — see the README's "Open TODOs
Before Public Launch" section. Each entry uses a generic Lucide icon since the project's `lucide-react@1.21.0` does not bundle brand icons
(no `Github`, no `Linkedin`).

## Open TODOs

- Replace social-link `href`s with real handles before launch.
- Replace generic `BriefcaseIcon` / `CodeXmlIcon` with proper brand SVGs shipped from `public/` once a brand kit lands.
- When Phase 3 adds Projects/Blog/Tools, swap the corresponding `ComingSoonCard` calls for real `<Link>` cards.
