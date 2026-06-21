# Portfolio Landing Page

## User Behavior

The root URL (`/` for German visitors, `/en` for English) shows the public landing page for Cem Yilmaz's site. It's the entry point for
everyone who isn't going through a deep-link.

The page doubles as Cem's **marketing surface** — it positions him as a freelance consultant for business-process digitalisation and AI
workflow implementation, while also signalling availability as a developing architect for standard web projects. The proof points are
**SAP** (enterprise depth) and **peopleeat** (startup speed, founding architect).

Top-to-bottom structure:

1. **Header** — site name (links back to `/`) and the bilingual `LanguageSelector` / `ThemeSelector`.
2. **Hero** — eyebrow chip ("Freelance · Consulting & Architecture"), bold headline, a value-proposition subhead naming SAP + peopleeat, and
   two CTAs side by side: primary **"Email me"** (mailto) and secondary **"Ask my AI assistant"** (links to `/chat`). A circular portrait of
   Cem (`/profile-picture.png`) sits to the right of the copy on `md+` screens and stacks above the copy on small screens, framed by a soft
   primary-tinted glow so it blends with the glass aesthetic.
3. **Proof strip** — a single `GlassCard` with two short blurbs about SAP and peopleeat.
4. **Services** — three pillar cards: Process digitalisation, AI workflows, Web architecture & development. Each card has an icon, a short
   description, and three bullets.
5. **Why me** — two cards contrasting enterprise depth (SAP) with startup speed (peopleeat).
6. **Assistant** — inline AI-assistant composer (Textarea + Send button) plus four pre-baked suggested-question chips and a soft disclaimer.
   Submitting the composer or clicking any chip opens a `Dialog` containing the question and a placeholder for the chat surface. This is the
   page's primary "act now" surface: the landing page is itself a demo of an AI workflow Cem builds.
7. **Explore** — secondary nav cards for `About`, `CV`, `Projects`, and the visitor AI chat. Demoted to the bottom of the page since the
   marketing pitch + assistant come first; still links to real routes.
8. **Footer** — contact links (GitHub, LinkedIn, email) plus legal links to `/impressum` and `/datenschutz`.

## Implementation Details

### File

`src/routes/{-$locale}/index.tsx` is the single source of truth. There is no companion `.graphql` file beyond the existing
`HomePage.graphql` query (which keeps the route's session loader wired so `currentSession` is available if a future revision needs it).

### Bilingual copy

All visitor-facing text lives in a single `COPY` constant at the top of the route file, keyed by section (`hero`, `proof`, `services`,
`whyMe`, `explore`, `assistant`, `footer`). Each entry is `{ de: string; en: string }` and is read with `entry[locale]`. **Do not**
introduce a translation library — see [`docs/architecture/i18n.md`](../architecture/i18n.md).

### CTAs

The primary CTA is a `<Button asChild>` wrapping a `mailto:` `<a>` tag built from `personalInfo.contact.emails[0]`. The secondary CTA is a
`<Button asChild variant="outline">` wrapping a TanStack Router `<Link to="/{-$locale}/chat">`. The hero shows both; further down the page,
the **Assistant** section replaces a static CTA band with an interactive AI composer that opens a `Dialog` on submit.

### Assistant section

The visual reference for this section is the Podologie Dudenhofen "Erst kurz fragen — dann anrufen" panel: an eyebrow ("Fragen?"), a
serif-feel heading, a soft intro paragraph, and a single `GlassCard` containing the composer.

The card uses an assistant header (avatar dot + "Cem's assistant" + green "available now · around the clock" status), a `Textarea` composer
with an inline `Send` button (`SendHorizontalIcon`), four suggested-question chip buttons under a "Popular questions" label, and a small
disclaimer line beneath the card.

Submitting the form (button click, or Enter without Shift), or clicking any suggestion chip, calls `setSubmittedQuestion(text)` which opens
an `AssistantDialog`. The dialog currently shows the user's question echoed back, a placeholder copy line, and `Close` / `Email me` buttons.
The dialog component is structured so it can be swapped for a real chat surface later without touching `AssistantSection`'s state machinery
— the next iteration will wire it to the existing `/chat` agent.

### SEO

`head()` calls `seoMeta()` with marketing-flavoured titles ("Cem Yilmaz — Digitalisation & AI consulting · Freelance software architect")
and uses the hero subhead as the meta `description`. The page is listed in `src/web/seo/sitemapRoutes.ts` as `path: '/'` with weekly
`changefreq` and priority `1.0`.

### Sections

All sections use the shared `GlassCard` primitive for visual consistency with the header and other public pages. The proof strip is a single
full-width card; the services and explore sections are grids of cards. The Why-Me cards and the Assistant card also use `GlassCard`. No new
shared components were extracted — the section helpers (`Hero`, `HeroPortrait`, `Services`, `WhyMe`, `AssistantSection`, `AssistantDialog`,
`Explore`, `SectionHeading`, `ServiceCard`, `WhyMeCard`, `ProofItem`, `NavCard`, `ChatCard`) live locally inside `index.tsx`.

### Social-link footer

Defined as `SOCIAL_LINKS` (a `ReadonlyArray` of `{ href, label, icon, visible }`). Hrefs come from `personalInfo.contact.*`. Each entry uses
a generic Lucide icon since the project's `lucide-react` does not bundle brand icons.

## Open TODOs

- Wire `AssistantDialog` to the real `/chat` agent — submit the seeded question, render the streaming reply inline. Today the dialog is a
  placeholder that echoes the question and offers an email fallback.
- Replace generic `BriefcaseIcon` / `CodeXmlIcon` with proper brand SVGs shipped from `public/` once a brand kit lands.
- Consider extracting the services / why-me sections into a dedicated `/services` route once the marketing copy settles and SEO benefits
  from a deeper page (see also `docs/conventions.md` for the bilingual route pattern).
