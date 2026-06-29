# Workspace Hub

The private side of cem-yilmaz.de is a personal workspace. Phase 1 ships the **navigation hub** — a single landing page that lists the focus
areas Cem actively works on and prominently hosts the personal-assistant composer. Per-area features land in later phases.

## User Behavior

- `/workspace` (DE) and `/en/workspace` (EN) render the hub: a slimmed-down workspace header (logo links home, a breadcrumb trail to the
  right shows where you are inside the workspace, and the assistant chat button sits on the right — language and theme selectors are
  intentionally absent on workspace surfaces), a small muted motivational quote (see "Hero quote" below), the personal-assistant composer
  directly under the quote, and a **bento-style focus-area grid** below that. The composer scrolls with the page — it is **not** pinned to
  the viewport bottom; on a typical desktop the composer is already on-screen at load, and pinning it overlapped the last row of focus cards
  behind a progressive blur, which read as "the input is parked on top of my last tile."
- Sending a message from the hub composer creates a new admin-scope chat and navigates to `/workspace/assistant?chatId=<id>`, where the rest
  of the conversation happens. The hub itself stays a hub — every visit lands on the empty composer again.
- The focus-area cards are split into two subgroups:
  - **Personal areas** (top): Software, Projects, Finances, Tax, Fitness, Medical, Movies & TV — the daily-use surfaces.
  - **Public site** (bottom, under a small muted "Öffentliche Website / Public site" heading): CV, Visitor chats. These manage what appears
    on the public `cem-yilmaz.de` (the CV editor writes the `Cv*` tables that feed `/cv` and `/about`; the visitor-chats surface is for
    reading what visitors have asked the public assistant). They sit at the bottom because they're touched rarely compared to the personal
    areas above.
  - Routes:
    - CV → `/workspace/cv`
    - Software → `/workspace/software`
    - Projects → `/workspace/projects`
    - Finances → `/workspace/finances`
    - Tax → `/workspace/tax`
    - Fitness → `/workspace/fitness`
    - Medical → `/workspace/medical`
    - Movies & TV → `/workspace/media`
    - Visitor chats → `/workspace/visitor-chats`
- Each focus-area page is a placeholder: the area name + icon, a one-line "this area is being built out" body, and a muted "Coming soon"
  line. No per-page back-link — the workspace header's breadcrumb trail is the way back to `/workspace`.
- The language switcher is hidden on workspace surfaces (the workspace is single-user private chrome; the locale toggle belongs to the
  public site). To switch locale, return to a public page via the logo.

## Hero quote

Above the focus-area grid sits a rotating motivational quote — replacing the static "Welcome back, Cem" greeting that used to live there. A
generic welcome was wallpaper; the quote is a quiet motivational beat at the top of the hub. It is **rendered small and muted on purpose**
(body-text size, italic, `text-muted-foreground`) — it is not the focus of the workspace; the assistant composer and the focus-area grid
are. The list lives in `src/web/content/workspaceQuotes.ts` as `{ de, en, attribution? }` triples (Cem's own lines + a handful of well-known
entrepreneurial / resilience quotes). Edited via PR, same pattern as `personalInfo.ts` and `portfolioProjects.ts`.

Selection is **deterministic per UTC day** via `workspaceQuotePick()` — `dayOfYear % quotes.length`. Two consequences:

- SSR and hydration agree without a `useEffect` flash on first paint.
- Navigating back to `/workspace` later in the same day shows the same line; the quote is decoration, not churn-content.

The visible element is a `<blockquote>`, not an `<h1>` — wrapping a quote in h1 reads oddly to screen readers and pins the document outline
to whatever line landed today. A visually-hidden `<h1>Workspace</h1>` keeps the page semantically identifiable for assistive tech without
putting that string into the visual hierarchy. The browser-tab title and `seoMeta` description are unchanged.

## Personal-assistant composer

The assistant composer sits **directly under** the hero quote, in normal page flow — not pinned to the bottom of the viewport. It's a small
wrapper around `<MessageComposer />` that submits into the workspace assistant chat provider (see [Workspace Chat](./chat-workspace.md)) via
`openWithMessage(text)`. On a typical desktop the quote + composer occupy the top half of the viewport, so the assistant is the first thing
the user sees and the most prominent affordance — the same priority the old sticky placement was trying to encode, just without the
side-effect of overlapping the focus-area cards. Removing the sticky composer also removed the `ProgressiveBlurBottom` field and the 256px
bottom padding `<main>` used to reserve; neither was carrying weight once the composer left the bottom of the viewport. The composer is
rendered with `autoFocus` so the textarea is the active element on landing — the user can start typing immediately without clicking.

Submitting the hub composer opens the **workspace assistant sheet** (the same sheet the header's assistant button on every other workspace
page opens) and fires the first message into it. The conversation stays in the sheet across navigation between focus areas; clicking **"Open
full-screen"** in the sheet's header navigates to `/workspace/assistant?chatId=<id>` for a dedicated full-screen surface. See
[Workspace Chat](./chat-workspace.md) for the sheet, header entry point, and full-screen jump-off behaviour.

## `/workspace/assistant`

The dedicated chat surface for the personal assistant. Same shape as the public visitor chat sheet: empty state with the composer, loaded
state with a header, the transcript, and the composer pinned to the bottom. The loaded transcript reads `Query.admin.chat(chatId)` so a
stolen chatId from the visitor namespace is rejected by `chatFindByScope`.

This route is the **bookmark-able** form of the same conversation that lives in the sheet. The sheet's "Open full-screen" button hands the
active `chatId` off to this route via a normal navigation; the sheet stays the in-context surface for short questions while doing other
workspace work, the route is for deep work where the chat IS the page. See [Workspace Chat](./chat-workspace.md).

The route is `noindex`, kept out of the sitemap, and unlinked from the public site — same posture as the rest of `/workspace/*`.

## Auth and visibility

The README and `AGENTS.md` describe `/workspace/*` as the **GitHub-OAuth-gated, Phase 2** surface. Phase 1 ships the navigation shell and
the personal-assistant composer; the OAuth gate has not been built yet. To keep the surface non-public until then:

- All workspace routes pass `noindex: true` to `seoMeta()`. Each page emits `<meta name="robots" content="noindex,nofollow">`, so search
  engines do not list them.
- None of the workspace paths are added to `SITEMAP_PATHS` in `src/web/seo/sitemapRoutes.ts`. The convention there is explicit: noindex /
  logged-in / transactional pages stay out of the sitemap.
- The public landing page (`/`) and the site footer **do not link** to `/workspace`. The hub is reachable only by typing the URL.
- `guardAdmin` (`src/server/guards/guardAdmin.ts`) and `guardAdminMutation` (`src/server/guards/guardAdminMutation.ts`) are **permissive in
  Phase 1** — they return the namespace shape rather than throwing. The split mirrors `guardUserMutation` so Phase 2 can layer different
  posture on writes (e.g. CSRF, narrower allowlist) without dragging the read path along. The permissive policy is intentional: the hub now
  needs the admin namespace to be reachable so Cem can use his own assistant. The combination of noindex + unlinked + URL-obscured keeps the
  surface effectively private until the OAuth gate lands. A `TODO(phase-2)` in each file points at the future allowlist check.

The README's "Open TODOs Before Public Launch" section calls out that the gate must wrap the whole `/workspace/*` tree before DNS goes live.

## Implementation Details

### Files

```
src/routes/{-$locale}/workspace/
├── index.tsx                          → /workspace               (hub + assistant composer)
├── assistant.tsx                      → /workspace/assistant     (loaded chat)
├── WorkspaceAssistantPage.graphql     admin-namespace operations for the chat
├── software.tsx                       → /workspace/software
├── projects.tsx                       → /workspace/projects
├── finances.tsx                       → /workspace/finances
├── tax.tsx                            → /workspace/tax
├── fitness.tsx                        → /workspace/fitness
├── medical.tsx                        → /workspace/medical
└── media.tsx                          → /workspace/media
```

All page files follow the same shape as `src/routes/{-$locale}/index.tsx` and `src/routes/{-$locale}/datenschutz.tsx`:
`createFileRoute(...)` with a `head()` that returns `seoMeta(...)`, plus a component that reads `useLocale()` and renders the locale's copy.

### Workspace header

Every workspace surface inherits the same chrome: `<WorkspaceHeader />` is mounted once at `src/routes/{-$locale}/workspace.tsx` (the
layout) and renders above the `<Outlet />`. Pages render only their body content — no per-page `<Header />` invocations and no per-page
`← Workspace` back-links.

`WorkspaceHeader` is a thin wrapper around `<Header />` that:

- passes `chatVariant="workspace"` so the chat button opens the personal-assistant sheet,
- passes `hideSelectors` so the language and theme selectors don't render (workspace is private chrome; locale/theme belong to the public
  site),
- builds a breadcrumb trail from the current pathname against a centralized `WORKSPACE_TITLES` map (path-segment → `{ de, en }` label) in
  the same file.

Adding a new `/workspace/<segment>` route: add one entry to `WORKSPACE_TITLES` so the breadcrumb has a label. Everything else is already in
the layout — the page file itself just exports its component.

The `<Header />` primitive grew two props to support this: `breadcrumbs?: ReadonlyArray<Crumb>` (replaces the brand cluster with
`logo + trail`; only the logo is a link, home) and `hideSelectors?: boolean`. The previous `brandLabel` variant is no longer used by any
workspace page but is kept on the primitive for any future surface that needs `logo + plain label` chrome.

### Hub layout

The hub reuses the same primitives the landing page does:

- `Card` / `CardContent` / `CardTitle` / `CardDescription` from `src/web/components/base/card.tsx`
- `useLocale()` from `src/web/hooks/useLocale.ts`
- `ChatComposer` from `src/web/chat/ChatComposer.tsx` (parameterized with the workspace mutation)
- `useChatLiveUpdates` from `src/web/chat/useChatLiveUpdates.tsx` (namespace-agnostic)

The header is **not** invoked by the hub itself — it comes from `<WorkspaceHeader />` mounted at the layout (see "Workspace header" above).
The hub's component body is only the assistant hero (quote + composer) and the focus-area grid.

A single `COPY` constant at the top of the file keys every visible string under `{ de, en }`. This follows the inline-bilingual-copy pattern
from `docs/architecture/i18n.md` — no translation library.

The cards are driven by two small `FocusArea[]` arrays — `PERSONAL_FOCUS_AREAS` and `PUBLIC_SITE_FOCUS_AREAS` (`{ key, to, icon }`) — and a
shared `<FocusCardGrid />` that renders one subgroup at uniform tile size with a parameterized `lg:grid-cols-*`. Adding a new focus area is
one entry to the right array plus one new file plus one new copy block.

**Two-subgroup layout.** The grid is split into a top "personal" subgroup and a bottom "public site" subgroup, separated by vertical spacing
and a small muted `<h2>` + one-line subtitle marking the boundary. Inside each subgroup every tile is the same size — the previous bento
with `primary` / `standard` / `wide` spans encoded a daily-vs-rare priority across one combined grid, but reading the layout as one flow
obscured that CV and Visitor chats are content-management surfaces for the public site rather than daily personal areas. Splitting them into
a labelled cluster at the bottom makes that grouping legible without relying on tile size as a proxy for it.

**Tile sizing.** Both subgroups use the same uniform grid: 1 column on `sm`, 2 on `md`, then 4 on `lg` for the personal subgroup (7 entries
→ 4 + 3 with a trailing gap on the second row) and 2 on `lg` for the public-site subgroup (2 entries side by side). The trailing gap is
intentional — adding a filler tile or shrinking to `lg:grid-cols-3` would just shift the awkwardness around. Card heights are uniform inside
a subgroup because every card has the same icon + title + one-line description layout.

**Card content.** Each card is icon + title on one row, a one-line description below, and an `ArrowUpRightIcon` tucked in the top-right
corner that brightens and translates on hover. The previous "Öffnen → / Open →" labelled-button row was redundant with the entire card being
a `<Link>`; removing it cut a row of vertical space per card without losing affordance — the cursor change on hover, the corner arrow, and
the card-wide hover state all still read as "this is clickable."

### Stub layout

Each focus-area stub has its own `COPY` constant (title, description, body, "coming soon") and a single `<main>` block: body paragraph →
muted "Coming soon" line. They are intentionally tiny — the goal of Phase 1 is for the navigation to exist, not for the rooms to be
furnished. Stubs don't render their own header, back-link, or on-page title row; the workspace header above the outlet provides the
breadcrumb (with the focus area's icon on the trailing crumb), so a duplicate `icon + h1` inside the page would only repeat what the chrome
already shows. The breadcrumb-with-icon contract is owned by `Header`'s `Crumb` type and rendered by `WorkspaceHeader` via `WORKSPACE_ICONS`
— see `src/web/components/WorkspaceHeader.tsx`.

### Wiring `ChatComposer` to the admin namespace

`ChatComposer` accepts three optional props that turn it from a visitor-only widget into a namespace-agnostic one:

- `sendMutation` — the `chatMessageCreate` document to call. Defaults to the visitor `ChatMessageCreateDocument`. The hub and the workspace
  assistant route pass `WorkspaceChatMessageCreateDocument` instead.
- `extractResult` — pulls `{ chatId }` out of the mutation result. The visitor default reads `data.chatMessageCreate`; the workspace callers
  pass an extractor that reads `data.admin.chatMessageCreate`.
- `placeholder` — localized placeholder string. Defaults to `"Type a message…"`.

The visitor chat sheet on the landing page (`WebsiteVisitorAssistantChatSheet`) is unchanged — it doesn't pass any of these and gets the
visitor defaults.

### SEO

Every workspace route passes `noindex: true` to `seoMeta()`. The shared canonical URL and `hreflang` alternates still render correctly via
`webPageUrlGet()` so a directly-shared link resolves cleanly, but the page is not indexed and not in the sitemap. See
`docs/architecture/seo.md` for the underlying conventions.

## Adding a new focus area

1. Add a new entry to `COPY.areas` in `src/routes/{-$locale}/workspace/index.tsx` (DE + EN copy).
2. Add a new entry to either `PERSONAL_FOCUS_AREAS` (daily-use surfaces) or `PUBLIC_SITE_FOCUS_AREAS` (content that feeds the public site)
   in the same file (key, route path, icon). If you're adding a third subgroup, factor a new array + `<FocusCardGrid />` invocation in
   `FocusAreaGrid` and pick an appropriate `lg:grid-cols-*` for its width.
3. Create a new stub file under `src/routes/{-$locale}/workspace/` mirroring one of the existing stubs (`software.tsx`, etc.). Use the same
   `COPY` shape and `seoMeta({ ..., noindex: true })`. The stub does **not** render its own `<Header />` or back-link — both come from the
   layout.
4. Add the new path-segment to `WORKSPACE_TITLES` in `src/web/components/WorkspaceHeader.tsx` so the breadcrumb has a label, and to
   `WORKSPACE_ICONS` in the same file so the trailing crumb gets the same Lucide icon used on the hub tile.
5. Do **not** add the new path to `SITEMAP_PATHS` — workspace routes stay out of the sitemap until they are public.

## Open TODOs

- **Phase 2 — OAuth gate.** Wrap `/workspace/*` behind GitHub OAuth (env vars `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`,
  `WORKSPACE_GITHUB_LOGINS`). The README and `AGENTS.md` already document the env vars; the gate itself does not exist yet. `guardAdmin` and
  `guardAdminMutation` are the files that flip from permissive to allowlist-checked.
- **Phase 2+ — populate focus areas.** Each stub becomes a real surface (per-area notes, lists, integrations) once the gate is in.
- **Follow-up — extract `ChatTranscript`.** The transcript layout in `src/web/chat/WebsiteVisitorAssistantChatSheet.tsx` and
  `src/routes/{-$locale}/workspace/assistant.tsx` is duplicated. Once a third surface needs it, extract to a shared component under
  `src/web/chat/`.
