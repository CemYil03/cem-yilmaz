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
2. **Hero** — eyebrow chip ("Freelance · Consulting & Architecture"), a short bold headline naming the three service pillars
   ("Digitalisation, AI workflows and web architecture." / "Digitalisierung, KI-Workflows und Web-Architektur."), a one-line sub-headline
   naming the audience (companies that need to ship), and a tighter two-sentence body. The dual-background contrast (enterprise depth +
   startup speed) is saved for the **Why me** section further down. A circular portrait of Cem (`/profile-picture.png`) sits to the right of
   the copy on `md+` screens and stacks above the copy on small screens, framed by a soft primary-tinted glow so it blends with the glass
   aesthetic.

   **The hero's primary call-to-action is the AI assistant itself**, embedded directly into the hero as a `GlassCard` beneath the headline
   block: an assistant header (avatar dot + "Cem's assistant" + green "available now · around the clock" status), the shared
   `MessageComposer`, four suggested-question chip buttons under a "Popular questions" label, and a small disclaimer line. The page does not
   show a separate email or "scroll down" button in the hero — the landing page is itself a demo of an AI workflow Cem builds, so the first
   interactive element is the assistant. Email lives in the footer; deep navigation lives in the Explore section further down.

3. **Services** — three pillar cards: Process digitalisation, AI workflows, Web architecture & development. Each card has an icon, a short
   description, and three **outcome-led** bullets — what the client walks away with ("Hours saved per case, every case", "A new product live
   — from empty repo to first user cohort"), not the activities that produce them.
4. **Why me ("Tiefe und Tempo")** — two cards contrasting **enterprise depth** with **startup speed (peopleeat)**. The enterprise card is
   intentionally anonymous — it leads with "Years of enterprise experience inside large, regulated environments" rather than naming a
   customer. This is the single proof section; the standalone proof strip and the standalone assistant section that used to sit between Hero
   and Why-Me were folded away (proof into this section, assistant into Hero).
5. **Call to action** — a wide `GlassCard` with an availability badge ("Currently capacity for 1 project from <next-month>"), a short pitch
   ("Let's talk about your project") and two primary buttons that seed the visitor chat with a project / intro-call prompt. A small mailto
   fallback link sits beneath the buttons so visitors who prefer email aren't forced through the assistant.
6. **Explore** — secondary nav cards for `About`, `CV`, and `Projects`. Demoted to the bottom of the page since the marketing pitch +
   assistant come first; still links to real routes.
7. **Footer** — contact links (GitHub, LinkedIn, email) plus legal links to `/impressum` and `/datenschutz`.

## Implementation Details

### File

`src/routes/{-$locale}/index.tsx` is the single source of truth. There is no companion `.graphql` file beyond the existing
`HomePage.graphql` query (which keeps the route's session loader wired so `currentSession` is available if a future revision needs it).

### Bilingual copy

All visitor-facing text lives in a single `COPY` constant at the top of the route file, keyed by section (`hero`, `services`, `whyMe`,
`cta`, `explore`, `footer`). The `hero` block bundles both the headline copy and the embedded assistant's labels (`assistantName`,
`assistantStatus`, `placeholder`, `send`, `suggestionsLabel`, `suggestions`, `disclaimer`) since the assistant is the hero's primary CTA
rather than a standalone section. Each entry is `{ de: string; en: string }` and is read with `entry[locale]`. The hero block splits its
headline copy into `headline` (short claim), `subheadline` (one-line category description) and `body` (two-sentence engagement intro) so
each line works at its own typographic altitude. **Do not** introduce a translation library — see
[`docs/architecture/i18n.md`](../architecture/i18n.md).

The `cta.availability` strings include a `{month}` token replaced at render time with the localised month name returned by
`availabilityMonthLabel(locale)` — a tiny helper in the same file that asks `Intl.DateTimeFormat` for the first day of the next calendar
month. The badge therefore always reads "from <next month> <year>" without manual upkeep.

### Hero CTA (the embedded assistant)

The hero has **no buttons**. The call-to-action is the assistant composer itself, mounted directly inside `Hero` below the headline /
sub-headline / body block. The composer state (`question`) lives in `Hero`; the dialog open state (`submittedQuestion`) is lifted to
`HomePage` so the CallToAction section further down the page can drive the same chat.

The visual treatment is a single `GlassCard` containing:

- an assistant header (avatar dot + "Cem's assistant" + green "available now · around the clock" status),
- the shared `MessageComposer` (controlled — `value` / `onValueChange` / `onSubmit`, no attachments slot, `rows={3}`),
- four suggested-question chip buttons under a "Popular questions" label,
- a small disclaimer line beneath the card.

Submit semantics (Enter to send, Shift+Enter for newline, send gating on non-empty input) come from `MessageComposer` itself — `Hero` only
supplies the value and the submit callback.

Submitting the composer, or clicking any suggestion chip, calls the `onOpenChat` callback owned by `HomePage` which sets `submittedQuestion`
and opens `<WebsiteVisitorAssistantChatDialog />` (`src/web/chat/WebsiteVisitorAssistantChatDialog.tsx`). The dialog is the live visitor
chat — it fires `chatMessageCreate` with the seeded question on open, mounts `useChatLiveUpdates` at its root so the subscription is in
place before the mutation publishes, and renders the same transcript + composer stack that used to live at the now-removed `/chat` route.
The dialog owns its own `chatId` in component state — closing it ends the session.

See [`docs/features/chat.md`](./chat.md) for the visitor chat surface itself.

### Call-to-action section

`CallToAction` is a single `GlassCard` with two halves on `md+`:

- **Left** — an availability badge ("Currently capacity for 1 project from <next month>"), the section heading ("Let's talk about your
  project"), and one paragraph explaining what happens after the visitor sends a brief.
- **Right** — a stacked button column: primary `Button` ("Request a project") and `variant="outline"` `Button` ("Book an intro call"), both
  of which call the same `onOpenChat` callback `HomePage` passes to `Hero`, seeded with a different opening sentence per button. A small
  `mailto:` link sits under the buttons so visitors who don't want to use the assistant still have an obvious path.

The section is intentionally between Why-Me and Explore: it sits after the proof and before the secondary navigation, so the closer fires
when the visitor has finished reading the pitch.

### SEO

`head()` calls `seoMeta()` with marketing-flavoured titles ("Cem Yilmaz — Digitalisation & AI consulting · Freelance software architect")
and uses the hero subhead as the meta `description`. The page is listed in `src/web/seo/sitemapRoutes.ts` as `path: '/'` with weekly
`changefreq` and priority `1.0`.

### Sections

All sections use the shared `GlassCard` primitive for visual consistency with the header and other public pages. The services, CTA, and
explore sections are grids of cards; the Why-Me cards and the Hero's embedded assistant card also use `GlassCard`. The section helpers
(`Hero`, `HeroPortrait`, `Services`, `WhyMe`, `CallToAction`, `Explore`, `SectionHeading`, `ServiceCard`, `WhyMeCard`, `NavCard`) live
locally inside `index.tsx`. The visitor chat dialog is the only piece extracted — it lives in
`src/web/chat/WebsiteVisitorAssistantChatDialog.tsx`.

### Footer

The footer is a shared component at `src/web/components/Footer.tsx` — not a section-helper inside `index.tsx`. It owns its own bilingual
copy, social-link config, and locale lookup (via `useLocale`), so other public routes can drop it in without threading copy through props.

Layout: a three-column grid on `md+` (brand block · sitemap · contact), stacked on mobile, with a bottom bar carrying the copyright, an
origin line ("Designed and built in Germany"), and the legal links to `/impressum` and `/datenschutz`. The brand column repeats the header's
favicon + wordmark pair so the page bookends cleanly, plus a one-paragraph blurb. The sitemap column links back into the public routes
(`/about`, `/cv`, `/projects`) with the same icons the Explore section uses — the footer earns its space as secondary navigation, not just a
contact strip. Contact renders as chip-style pills matching the hero's "popular questions" buttons.

The footer is separated from the page above by a brand-tinted hairline gradient (`from-transparent via-primary/40 to-transparent`) along its
top edge rather than a flat `border-t` — keeps the page in the calm-glass system instead of reading as a generic CMS strip.

### Social-link footer

Social-link visibility is governed by `personalInfo.publicVisibility.{github,linkedin,emails}`. Hrefs come from `personalInfo.contact.*`.
Each entry uses a generic Lucide icon since the project's `lucide-react` does not bundle brand icons.

### Motion

The landing page uses restrained, purposeful motion — no animation for animation's sake. Six behaviours:

1. **Section reveal on scroll** — `Services`, `WhyMe`, `CallToAction` and `Explore` (and their grid children) fade in (`opacity 0 → 1`) and
   lift 8px once they cross the viewport's 15% intersection threshold. Grid children stagger by 70ms per index, capped at three steps so a
   long list never feels like it's loading row-by-row. The Hero is intentionally not revealed — it sits above the fold and animating it on
   first paint would feel slow. Wired through `<Reveal>` (`src/web/components/Reveal.tsx`), which builds on the shared `useInView` hook
   (`src/web/hooks/useInView.ts`). The observer disconnects after the first crossing so scrolling back up never re-animates.
2. **Assistant status pulse** — the green "available now" dot inside the hero's assistant card breathes via an opacity-only 2s loop
   (`@keyframes pulse-dot` in `src/styles.css`, applied with `animate-pulse-dot`). Opacity, not scale — scaling looks like a buggy radio
   button at this size.
3. **Portrait halo drift** — the blurred primary-tinted halo behind the hero portrait drifts on a 24s `ease-in-out` loop with a tiny
   translate (`@keyframes portrait-halo-drift`, applied with `animate-portrait-halo`). Imperceptible per-frame — the page feels alive
   without anything visibly moving.
4. **Header scrolled state** — once `window.scrollY > 8`, the `Header`'s `GlassCard` background firms up (`bg-white/70` light, `bg-white/8`
   dark) over a 200ms transition. Keeps the floating nav legible once the user scrolls past the hero, without making it heavy at rest.
   Tracked by a local `useHasScrolled` hook in `src/web/components/Header.tsx`.
5. **NavCard arrow** — hovering an Explore card translates its arrow 1 unit right (`group-hover:translate-x-1`) over 200ms instead of the
   previous gap-grow. Reads as "go" rather than "stretch".
6. **Dialog open** — the visitor chat dialog uses Radix's stock fade + zoom-in on open, no custom motion layered on top.

**`prefers-reduced-motion: reduce` honours the user's OS-level setting at every layer:** `useInView` short-circuits to `inView = true` so
the Reveal component renders at its final state; `Reveal`'s transform is suppressed via `motion-reduce:`; the keyframe animations
(`pulse-dot`, `portrait-halo-drift`, the ambient `drift`) are paused by a media query in `styles.css`; the NavCard arrow translate is
suppressed via `motion-reduce:group-hover:translate-x-0`.

Durations stay between 150ms and 500ms, easings use `cubic-bezier(0.2, 0.8, 0.2, 1)` (an out-quint) or `ease-out`. No bounces, no scale
beyond identity, no parallax. The design directive is professional, clean, minimalistic, trustworthy and tasteful — motion is held to that
bar.

## Open TODOs

- Replace generic `BriefcaseIcon` / `CodeXmlIcon` with proper brand SVGs shipped from `public/` once a brand kit lands.
- Consider extracting the services / why-me sections into a dedicated `/services` route once the marketing copy settles and SEO benefits
  from a deeper page (see also `docs/conventions.md` for the bilingual route pattern).
