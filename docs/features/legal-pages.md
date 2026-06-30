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

### Content state

- `impressum.tsx` reads provider data (name, address, email, phone) from `src/web/content/personalInfo.ts` plus the local `IMPRESSUM_STREET`
  constant. Real values are committed.
- `datenschutz.tsx` ships a GDPR notice covering: controller, hosting (IONOS SE, Montabaur — Art. 28 DPA auto-binding via IONOS' standard
  terms, German servers), the technically-necessary session cookie (12-month browser-side validity; **server-side `Sessions` row not
  auto-deleted today** — see "Retention claims" below), the visitor AI chat against Google Gemini Generative Language API **paid tier**
  (Google Ireland Limited; SCCs for the US transfer; no training on customer prompts per Google's API terms), chat file attachments,
  outbound email via **Resend, Inc. (US transfer; SCCs; Art. 28 DPA auto-concluded per Resend's terms; sub-processors all US, listed at
  `resend.com/legal/subprocessors`; Resend does not publish a specific delivery-metadata retention period)**, structured project requests
  stored in the `ProjectRequests` table (Art. 6(1)(b) GDPR), the one-time-code email-verification flow that gates project requests
  (hash-only storage; 10-minute expiry), server logs (no fixed retention — kept under standard Docker/Coolify rotation), and data-subject
  rights (Art. 15–21) with the LfDI Rheinland-Pfalz as the supervisory authority.

### Retention claims

The page **does not promise any fixed automated-deletion period** for application data (sessions, chats, project requests, application
logs). This is deliberate: today there is no retention cleanup job. `Sessions` / `Logs` / `Chats` / `ProjectRequests` have no date-bound
delete anywhere in `commands/` or `jobs/`. The page therefore says "deletion on request and otherwise once the processing purpose has
finally ceased" — defensible and truthful.

When a real retention job lands (sweep stale `Sessions`, prune `Logs` past 14 days, archive verified `ProjectRequests` past N months), the
page **must** be updated to re-introduce concrete numbers. Same for the server logs: if `/etc/docker/daemon.json` is ever configured with
`log-opts.max-size`/`max-file` to bound on-disk retention, the wording can switch back to a concrete window.

The page must be revisited whenever the data-processing surface grows — e.g. when GitHub OAuth lands for `/workspace/*`, when analytics is
added, or when a contact form / third-party embed appears. See the README's "Open TODOs Before Public Launch" section.

## Why it matters

A missing or insufficient Impressum is fine-able under TMG §16. A vague privacy notice that doesn't disclose the AI-chat data flow is a GDPR
Art. 13 violation. Treat the launch checklist on these pages as a hard gate, not a nice-to-have.
