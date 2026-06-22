# AI-search optimization (GEO)

## Context

Classical SEO optimizes for search engines that crawl, index, and rank pages. AI-search ("generative engine optimization", GEO) optimizes
for systems that crawl, extract, and **cite** — Perplexity, ChatGPT Search, Google AI Overviews, Claude, You.com, and the like. They reward
different signals than Google ten years ago: machine-readable summaries beat keyword density, discrete Q&A blocks beat long prose, fresh
timestamps beat hand-curated PageRank, and explicit bot policies beat implicit allows.

This site is a personal-brand surface. Being cited correctly by AI engines — name, role, location, contact channels, project list — matters
more than ranking on the bare keyword "cem yilmaz". The chat assistant on the homepage is the strongest signal we have: an AI surface that
already answers questions about Cem authoritatively. Everything else exists to point AI crawlers at it.

## Decision

Five layers cooperate. Each is small; together they cover the surface AI engines actually look at.

| Layer                | Where                                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------- |
| Explicit bot policy  | `src/routes/robots[.]txt.ts` — every major AI crawler enumerated with `Allow: /`             |
| LLM-native index     | `src/routes/llms[.]txt.ts` — markdown summary at `/llms.txt` per the `llmstxt.org` proposal  |
| Entity grounding     | `src/web/seo/jsonLd.ts` — `WebSite` + `Person` on `/`, `ProfilePage` on `/about`             |
| Verbatim Q&A         | `src/routes/{-$locale}/about.tsx` — visible `FaqBlock` mirrored into `FAQPage` JSON-LD       |
| Freshness signal     | `__SITE_LAST_MODIFIED__` (Vite-injected git commit ISO) → `dateModified` on every JSON-LD    |
| Conversational entry | `?ask=…` deep-link on `/` opens the visitor chat preseeded — engines can hand off mid-answer |

## Alternatives considered

1. **Block all AI crawlers.** Strongest privacy stance, but a personal-brand site is by definition public — the trade-off is steep and
   rejected.
2. **Allow only inference crawlers (PerplexityBot, OAI-SearchBot, ChatGPT-User) and block training crawlers (GPTBot, ClaudeBot,
   Google-Extended, Applebot-Extended).** Plausible policy ("cite me but don't memorize me"). Rejected because the line between training and
   inference blurs every quarter (e.g. Anthropic uses `anthropic-ai` for both), and because Cem's content is already extensively public on
   GitHub, LinkedIn, and the existing CV — training opt-out gives little practical privacy on top.
3. **Re-implement an `llms.txt` as a static file in `public/`.** Rejected for the same reason `sitemap.xml` and `robots.txt` are dynamic
   routes: the absolute URLs need `WEB_PAGE_URL`, and one source-of-truth handler beats two files that drift.
4. **Inline FAQ Q&A only in `personalInfo` and read it from both `/about` and `/llms.txt`.** Tempting for DRY. Rejected because the FAQ
   answers are page-specific copy (paragraph-shaped, tone-matched), not identity facts; pulling them through `personalInfo` would turn that
   file into a content store. The visible block on `/about` is the source of truth; `jsonLd.ts` reads it via the same `buildFaq()`.

## Consequences

- AI crawlers see explicit consent, which matters for the bots that respect a denylist by default (`PerplexityBot`, `OAI-SearchBot`,
  `ClaudeBot`).
- `/llms.txt` gives engines an authoritative content map without scraping rendered HTML — fewer hallucinations about site structure.
- Every JSON-LD block carries `dateModified`, the most recent git commit timestamp. After a deploy without code changes the value is stable;
  pages do not look stale to engines.
- The visible `FaqBlock` on `/about` and the `FAQPage` JSON-LD are populated from the same `buildFaq()` function — schema and DOM can't
  drift, and Google won't down-weight the schema for "structured-data mismatch".
- `?ask=…` makes the chat a citable target. AI engines can answer "How do I hire Cem?" with a follow-up link of the form
  `https://cem-yilmaz.de/?ask=Are+you+available+for+a+project+in+Q3`. The dialog opens, the chat composes the first turn, the visitor is in
  the funnel.
- New build dependency on `git` being available at build time. The fallback in `vite.config.ts` (current date) keeps the build green outside
  of a worktree; CI/Coolify always satisfies the git constraint.

## Bot policy

`robots.txt` enumerates AI crawlers explicitly. Currently allowed (with the same `Disallow` rules as `*`):

| Bot                 | Operator     | Purpose                                       |
| ------------------- | ------------ | --------------------------------------------- |
| `GPTBot`            | OpenAI       | Training corpus crawl                         |
| `OAI-SearchBot`     | OpenAI       | ChatGPT Search live-citation fetch            |
| `ChatGPT-User`      | OpenAI       | Per-conversation fetch (when ChatGPT browses) |
| `ClaudeBot`         | Anthropic    | Training + inference                          |
| `anthropic-ai`      | Anthropic    | Legacy umbrella UA                            |
| `PerplexityBot`     | Perplexity   | Index + citation                              |
| `Perplexity-User`   | Perplexity   | Per-query browse fetch                        |
| `Google-Extended`   | Google       | Gemini training opt-in                        |
| `Applebot-Extended` | Apple        | Apple Intelligence training opt-in            |
| `CCBot`             | Common Crawl | Open dataset feeding most LLMs                |
| `cohere-ai`         | Cohere       | Training                                      |

Disallow rules apply uniformly: `/api/`, `/server/`, `/workspace/`. Adding a new AI agent is a one-line edit in `AI_USER_AGENTS`.

To switch to a "block training, allow citation" stance later, split the array into `AI_INFERENCE_AGENTS` (allow) and `AI_TRAINING_AGENTS`
(emit `Disallow: /` for the second group).

## llms.txt

Lives at `/llms.txt`. Format follows the `llmstxt.org` proposal (markdown, H1 = site name, blockquote summary, H2 sections of bulleted
resource links). English-only — the consumer is an LLM, which speaks English natively; the linked pages cover both locales via `hreflang`.

Keep `llmsTxtBuild()` in sync with `SITEMAP_PATHS` whenever a new public page lands. The pattern is the same as the sitemap: one entry per
linkable resource. Resource bullets follow the spec: `[title](url): one-sentence description.`

When the markdown blog ships (Phase 3) and discovery questions like "what has Cem written about?" become common, add an `## Articles`
section emitted from the blog DB.

## Structured data

Three schemas across two pages:

- **Homepage `/`** — `WebSite` + `Person` (`src/web/seo/jsonLd.ts::jsonLdScripts`). Anchors the site identity for AI engines. `Person` has
  `sameAs: [github, linkedin]` so engines can reconcile Cem across surfaces.
- **About `/about`** — `ProfilePage` (mainEntity = the same `Person`) + `FAQPage` (mirrors the visible Q&A). `ProfilePage` is schema.org's
  purpose-built type for "about me" pages; AI engines prefer it to a bare `Person` on a generic URL.
- **Future blog posts** — when Phase 3 lands, add `Article` schema with `author = Person` so individual posts inherit Cem's identity.

All schemas carry `dateModified`, sourced from the Vite-injected `__SITE_LAST_MODIFIED__` (the last git commit ISO). Update once per deploy;
no manual bookkeeping.

## FAQ block

The Q&A on `/about` exists in one place: the `buildFaq(locale)` function in `src/routes/{-$locale}/about.tsx`. Both the visible `FaqBlock`
component and the `FAQPage` JSON-LD read from it. When adding a question:

1. Pick something a visitor (or an AI engine answering on behalf of a visitor) would actually ask.
2. Write a 1–3 sentence answer that stands alone — AI engines extract verbatim, so the answer must read correctly without context.
3. Add it to both the DE and EN branches of `buildFaq()`. Schema content not matching visible content gets the schema down-weighted.

Avoid marketing prose. AI engines reward factual, atomic, source-cited answers.

## Chat deep-link

`/?ask=<question>` opens the visitor-chat dialog preseeded with the question and fires it as the first turn. Implementation:

- `Route.validateSearch` (homepage) parses `ask` with Zod (trimmed, 1–500 chars, optional).
- `HomePage` reads it with `Route.useSearch()` and fires `openWithMessage(ask)` from a one-shot effect on mount.
- The chat dialog (mounted at `__root.tsx`) handles the rest via its existing `intent` state machine.

The `llms.txt` file points engines at the homepage but doesn't advertise the `?ask=` syntax explicitly — the syntax is for engines that
construct their own follow-up URLs, not a knob for the AI to twiddle. If we ever want explicit advertising, add it as a bullet under
`## Contact` in `llms.txt`.

## Validation

After each deploy:

1. Curl `https://cem-yilmaz.de/robots.txt` and `https://cem-yilmaz.de/llms.txt` — confirm `WEB_PAGE_URL` resolved correctly.
2. Run any homepage URL through [Google's Rich Results Test](https://search.google.com/test/rich-results) — `WebSite`, `Person`,
   `ProfilePage`, `FAQPage` should all render.
3. Open `https://cem-yilmaz.de/?ask=Where+do+you+live` — the chat should open with that question preseeded.
4. Spot-check a few AI engines: ask Perplexity / ChatGPT Search "who is Cem Yilmaz" — citations should point at this site.

## Maintenance

- New AI bot announced → add to `AI_USER_AGENTS` in `src/routes/robots[.]txt.ts`.
- New public page → add an entry to `llmsTxtBuild()` in `src/routes/llms[.]txt.ts` (mirror the SITEMAP_PATHS change).
- Identity fact changes (location, contact) → update `personalInfo.ts`; all schemas + llms.txt pick it up.
- New common visitor question surfaces in the visitor-chat logs → consider promoting it into `buildFaq()` on `/about`.
