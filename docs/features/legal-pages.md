# Legal Pages — Impressum and Datenschutz

A site reachable from Germany has two legally-required pages:

- An **Impressum** with provider information per **TMG §5** (German Telemedia Act).
- A **Datenschutzerklärung** (privacy notice) per **GDPR Art. 13**.

Both pages are bilingual (DE + EN) and live under `/impressum` and `/datenschutz`.

## User Behavior

- The site footer on every page links to both, in the active locale.
- Each page renders one column of legal text. There is no interactivity.
- The pages are indexable; they appear in `/sitemap.xml`.
- Both pages start with a "back to home" link.

## Implementation Details

### Files

- `src/routes/{-$locale}/impressum.tsx`
- `src/routes/{-$locale}/datenschutz.tsx`

Both follow the same shape as any other route under `{-$locale}/`: `createFileRoute(...)` + `head()` returning `seoMeta()` + a component
that reads `useLocale()` and renders the locale's copy.

### Sitemap

Both paths are entries in `SITEMAP_PATHS` (`src/web/seo/sitemapRoutes.ts`) with `changefreq: 'yearly'` and `priority: 0.3`. The dynamic
`/sitemap.xml` emits one `<url>` per locale per page with cross-locale `hreflang` alternates.

### Why German names for both routes

German legal terms are recognizable to a German visitor in either UI language; an English-speaking visitor doesn't lose anything by seeing
the URL contain `impressum`. We could have rewritten the EN paths to `/imprint` and `/privacy`, but the cost (locale-aware route names,
special casing in `seoMeta`) outweighs the benefit. The page **content** switches language; the URL doesn't.

### Placeholder content

The Phase 1 ship contains **placeholders** for the real legal data:

- `impressum.tsx` — `PLACEHOLDER` constant at the top of the file with `name`, `addressLines`, `email`, `phone`. Marked `TODO(launch):`.
- `datenschutz.tsx` — a baseline GDPR notice that covers what the site actually does today (session cookie, visitor chat hitting Google
  Gemini, server logs, planned workspace OAuth). Marked `TODO(launch):` to expand once analytics / contact form / additional data flows are
  added.

These placeholders **must be replaced before pointing DNS at production.** See the README's "Open TODOs Before Public Launch" section.

## Why it matters

A missing or insufficient Impressum is fine-able under TMG §16. A vague privacy notice that doesn't disclose the AI-chat data flow is a GDPR
Art. 13 violation. Treat the launch checklist on these pages as a hard gate, not a nice-to-have.
