# Portfolio Landing Page

## User Behavior

The root URL (`/` for German visitors, `/en` for English) shows the public landing page for Cem Yilmaz's site. It's the entry point for
everyone who isn't going through a deep-link.

The page doubles as Cem's **marketing surface** — it positions him as a freelance consultant for business-process digitalisation and AI
workflow implementation, while also signalling availability as a developing architect for standard web projects. The proof points are
**enterprise depth** (large, regulated environments — anonymous on purpose) and **peopleeat** (startup speed, founding architect — named
because it is Cem's own track record, not a logo name-drop).

Top-to-bottom structure:

1. **Header** — site name (links back to `/`) and the bilingual `LanguageSelector` / `ThemeSelector`.
2. **Hero** — eyebrow chip ("Freelance · Consulting & Architecture"), a short bold headline ("Enterprise depth. Startup speed." /
   "Enterprise-Tiefe. Startup-Tempo."), a one-line sub-headline naming the category (digitalisation + AI), and a tighter two-sentence body.
   A circular portrait of Cem (`/profile-picture.png`) sits to the right of the copy on `md+` screens and stacks above the copy on small
   screens, framed by a soft primary-tinted glow so it blends with the glass aesthetic.

   **The hero's primary call-to-action is the AI assistant itself**, embedded directly into the hero as a `GlassCard` beneath the headline
   block: an assistant header (avatar dot + "Cem's assistant" + green "available now · around the clock" status), the shared
   `MessageComposer`, four suggested-question chip buttons under a "Popular questions" label, and a small disclaimer line. The page does not
   show a separate email or "scroll down" button in the hero — the landing page is itself a demo of an AI workflow Cem builds, so the first
   interactive element is the assistant. Email lives in the footer; deep navigation lives in the Explore section further down.

3. **Services** — three pillar cards: Process digitalisation, AI workflows, Web architecture & development. Each card has an icon, a short
   description, and three bullets.
4. **Why me ("Tiefe und Tempo")** — two cards contrasting **enterprise depth** with **startup speed (peopleeat)**. The enterprise card is
   intentionally anonymous — it leads with "Years of enterprise experience inside large, regulated environments" rather than naming a
   customer. This is the single proof section; the standalone proof strip and the standalone assistant section that used to sit between Hero
   and Why-Me were folded away (proof into this section, assistant into Hero).
5. **Explore** — secondary nav cards for `About`, `CV`, and `Projects`. Demoted to the bottom of the page since the marketing pitch +
   assistant come first; still links to real routes.
6. **Footer** — contact links (GitHub, LinkedIn, email) plus legal links to `/impressum` and `/datenschutz`.

## Implementation Details

### File

`src/routes/{-$locale}/index.tsx` is the single source of truth. There is no companion `.graphql` file beyond the existing
`HomePage.graphql` query (which keeps the route's session loader wired so `currentSession` is available if a future revision needs it).

### Bilingual copy

All visitor-facing text lives in a single `COPY` constant at the top of the route file, keyed by section (`hero`, `services`, `whyMe`,
`explore`, `footer`). The `hero` block bundles both the headline copy and the embedded assistant's labels (`assistantName`,
`assistantStatus`, `placeholder`, `send`, `suggestionsLabel`, `suggestions`, `disclaimer`) since the assistant is the hero's primary CTA
rather than a standalone section. Each entry is `{ de: string; en: string }` and is read with `entry[locale]`. The hero block splits its
headline copy into `headline` (short claim), `subheadline` (one-line category description) and `body` (two-sentence engagement intro) so
each line works at its own typographic altitude. **Do not** introduce a translation library — see
[`docs/architecture/i18n.md`](../architecture/i18n.md).

### Hero CTA (the embedded assistant)

The hero has **no buttons**. The call-to-action is the assistant composer itself, mounted directly inside `Hero` below the headline /
sub-headline / body block. The composer state (`question`, `submittedQuestion`) lives in `Hero` because that is where the affordance now
lives.

The visual treatment is a single `GlassCard` containing:

- an assistant header (avatar dot + "Cem's assistant" + green "available now · around the clock" status),
- the shared `MessageComposer` (controlled — `value` / `onValueChange` / `onSubmit`, no attachments slot, `rows={3}`),
- four suggested-question chip buttons under a "Popular questions" label,
- a small disclaimer line beneath the card.

Submit semantics (Enter to send, Shift+Enter for newline, send gating on non-empty input) come from `MessageComposer` itself — `Hero` only
supplies the value and the submit callback.

Submitting the composer, or clicking any suggestion chip, calls `setSubmittedQuestion(text)` which opens
`<WebsiteVisitorAssistantChatDialog />` (`src/web/chat/WebsiteVisitorAssistantChatDialog.tsx`). The dialog is the live visitor chat — it
fires `chatMessageCreate` with the seeded question on open, mounts `useChatLiveUpdates` at its root so the subscription is in place before
the mutation publishes, and renders the same transcript + composer stack that used to live at the now-removed `/chat` route. The dialog owns
its own `chatId` in component state — closing it ends the session.

See [`docs/features/chat.md`](./chat.md) for the visitor chat surface itself.

### SEO

`head()` calls `seoMeta()` with marketing-flavoured titles ("Cem Yilmaz — Digitalisation & AI consulting · Freelance software architect")
and uses the hero subhead as the meta `description`. The page is listed in `src/web/seo/sitemapRoutes.ts` as `path: '/'` with weekly
`changefreq` and priority `1.0`.

### Sections

All sections use the shared `GlassCard` primitive for visual consistency with the header and other public pages. The services and explore
sections are grids of cards; the Why-Me cards and the Hero's embedded assistant card also use `GlassCard`. The section helpers (`Hero`,
`HeroPortrait`, `Services`, `WhyMe`, `Explore`, `SectionHeading`, `ServiceCard`, `WhyMeCard`, `NavCard`) live locally inside `index.tsx`.
The visitor chat dialog is the only piece extracted — it lives in `src/web/chat/WebsiteVisitorAssistantChatDialog.tsx`.

### Social-link footer

Defined as `SOCIAL_LINKS` (a `ReadonlyArray` of `{ href, label, icon, visible }`). Hrefs come from `personalInfo.contact.*`. Each entry uses
a generic Lucide icon since the project's `lucide-react` does not bundle brand icons.

## Open TODOs

- Replace generic `BriefcaseIcon` / `CodeXmlIcon` with proper brand SVGs shipped from `public/` once a brand kit lands.
- Consider extracting the services / why-me sections into a dedicated `/services` route once the marketing copy settles and SEO benefits
  from a deeper page (see also `docs/conventions.md` for the bilingual route pattern).
