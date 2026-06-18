# SEO

## Context

Public-facing pages need consistent, correct metadata so search engines and social platforms can discover, index, and link them. Without a
shared building block every new page silently inherits poor defaults: a placeholder `<title>`, no description, no canonical, no Open
Graph/Twitter cards, and — critically for a bilingual site — no `hreflang` alternates. Drift across pages becomes a maintenance burden once
there are more than a few of them.

## Decision

A single `seoMeta()` helper produces the full set of meta and link tags from a small per-page input. Each page route calls it from TanStack
Router's `head()` callback. Sitemap and robots are served dynamically so the absolute URLs reflect the deployed environment.

The pieces:

| Concern             | Where                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| Per-page meta+links | `src/web/seo/seoMeta.ts` — pure helper; tests in `seoMeta.test.ts`                                       |
| Site-wide constants | `src/web/seo/seoConstants.ts` — `SITE_NAME`, default share image, OG locale map                          |
| Absolute origin     | `WEB_PAGE_URL` env var → `EnvironmentVariables.webPageUrl`; resolved on the client via `webPageUrlGet()` |
| Sitemap             | Dynamic route `src/routes/sitemap[.]xml.ts`; entries in `src/web/seo/sitemapRoutes.ts`                   |
| Robots              | Dynamic route `src/routes/robots[.]txt.ts`                                                               |

## Alternatives considered

1. **Static `public/sitemap.xml` and `public/robots.txt`.** The starting point. Rejected: every new page requires editing two files, sitemap
   URLs are brittle across environments (one file can't carry both prod and preview origins), and per-locale `hreflang` markup is tedious to
   maintain by hand.
2. **Walk the generated `routeTree` to build the sitemap.** Rejected: `routeTree.gen.ts` is `@ts-nocheck` and its runtime shape isn't part
   of the router's public contract — coupling to it is fragile. An explicit `SITEMAP_PATHS` list is one extra line per page and makes
   "what's indexable?" obvious.
3. **Read the request `Host` header for the absolute origin.** Rejected per the project decision: the env var is the single source of truth
   and survives prerender, tests, and proxy variation.
4. **Force an explicit `/de` prefix for the default locale.** Rejected: would require either adding `/de` as a router alias or breaking
   existing routing. The chosen scheme — bare path for `de`, `/en` prefix for English — matches how `src/routes/{-$locale}.tsx` already
   redirects.

## Consequences

- One mandatory env var (`WEB_PAGE_URL`) — see `docs/infrastructure.md`.
- Adding a new public page is two lines: a `head:` block in the route file and an entry in `src/web/seo/sitemapRoutes.ts`.
- Localized pages get `hreflang` alternates and an `x-default` automatically — no per-page bookkeeping.
- Logged-in / transactional pages set `noindex: true` on `seoMeta()` and are omitted from `SITEMAP_PATHS`. The chat route is the canonical
  example.
- The helper is pure and isomorphic; client-side navigation updates the head correctly via TanStack Router's standard mechanism.

## Canonical URL strategy

Per-locale canonicals follow the routing setup:

| Locale         | Path on the site   | Canonical                                                |
| -------------- | ------------------ | -------------------------------------------------------- |
| `de` (default) | `/`, `/terms`      | `https://example.com`, `https://example.com/terms`       |
| `en`           | `/en`, `/en/terms` | `https://example.com/en`, `https://example.com/en/terms` |

For each page `seoMeta()` emits one `<link rel="canonical">` and one `<link rel="alternate" hreflang="…">` per configured locale plus
`hreflang="x-default"` pointing at the default-locale URL.

## How to add SEO to a new page

1. Pick a `title` (≤ 60 chars before the ` — Project name` suffix) and a `description` (50–160 chars). Localize both via the standard
   `{ de: '…', en: '…' }[locale]` pattern.
2. In your route file, import `seoMeta`, `webPageUrlGet`, and `localeFromParam`, then add a `head:` callback to the route options:

   ```tsx
   import { seoMeta } from '../../web/seo/seoMeta';
   import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
   import { localeFromParam } from '../../web/utils/locale';

   export const Route = createFileRoute('/{-$locale}/about')({
     head: ({ params }) => {
       const locale = localeFromParam(params);
       return seoMeta({
         title: { de: 'Über uns', en: 'About us' }[locale],
         description: {
           de: 'Wer wir sind und was wir tun.',
           en: 'Who we are and what we do.',
         }[locale],
         path: '/about',
         locale,
         webPageUrl: webPageUrlGet(),
       });
     },
     component: AboutPage,
   });
   ```

3. If the page is logged-in, transactional, or otherwise non-indexable, pass `noindex: true` to `seoMeta()` and skip step 4.
4. Add an entry to `SITEMAP_PATHS` in `src/web/seo/sitemapRoutes.ts`:

   ```ts
   { path: '/about', changefreq: 'monthly', priority: 0.5 },
   ```

5. Run `npm run check` and `npm test`. Visit `/sitemap.xml` locally to confirm the new path is present and has both locale variants.

### Parameterized routes (`/foo/$id`)

Don't add parameterized paths to `SITEMAP_PATHS` — the sitemap can't enumerate their values at build time. If those pages should be indexed,
generate a per-row sitemap from the database in a separate route (e.g. `src/routes/sitemap-posts[.]xml.ts`) and reference it from
`robots.txt`. Until that exists, parameterized pages still get correct `<head>` tags via their own `head:` callback; they just don't appear
in the sitemap.

## Implementation notes

- `seoMeta()` takes `webPageUrl` as an argument (rather than reading a global). This keeps it pure and trivially testable. The route layer
  plumbs the value via `webPageUrlGet()`, an isomorphic helper that returns `EnvironmentVariables.webPageUrl` server-side and
  `window.location.origin` client-side. The client fallback only matters during client-side navigation; SSR (the version crawlers see)
  always uses the configured value.
- The OG locale tag uses BCP-47–style underscored codes (`de_DE`, `en_US`) which is what Facebook and most consumers accept. Update
  `OG_LOCALE` in `src/web/seo/seoConstants.ts` whenever a locale is added.
- The dynamic sitemap lives at `/sitemap.xml` and the robots file at `/robots.txt` — both are real route handlers
  (`src/routes/sitemap[.]xml.ts` and `src/routes/robots[.]txt.ts`) and the corresponding files in `public/` were removed so there's no
  precedence conflict.
- `Cache-Control: public, max-age=3600` on both endpoints — long enough to amortize cost, short enough that a deploy propagates new pages
  within an hour.
