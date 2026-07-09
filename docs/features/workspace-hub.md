# Workspace Hub

The private side of cem-yilmaz.de is a personal workspace. Phase 1 ships the **navigation hub** — a single landing page that lists the focus
areas Cem actively works on and prominently hosts the personal-assistant composer. Per-area features land in later phases.

## User Behavior

- `/workspace` (DE) and `/en/workspace` (EN) render the hub: a slimmed-down workspace header (logo links home, a breadcrumb trail to the
  right shows where you are inside the workspace, and the assistant chat button plus theme selector sit on the right — the language selector
  is intentionally absent because the workspace is English-only), a small muted motivational quote (see "Hero quote" below), the
  personal-assistant composer directly under the quote, and a **bento-style focus-area grid** below that. The composer scrolls with the page
  — it is **not** pinned to the viewport bottom; on a typical desktop the composer is already on-screen at load, and pinning it overlapped
  the last row of focus cards behind a progressive blur, which read as "the input is parked on top of my last tile."
- Sending a message from the hub composer creates a new admin-scope chat and pops the workspace assistant sheet so the streaming response
  surfaces in context. The hub itself stays a hub — every visit lands on the empty composer again.
- The focus-area cards are split into two subgroups:
  - **Personal areas** (top): Software, Projects, Finances, Inventory, Tax, Fitness, Medical, Movies & TV, Travel — the daily-use surfaces.
  - **Public site** (bottom, under a small muted "Öffentliche Website / Public site" heading): CV, Visitor chats. These manage what appears
    on the public `cem-yilmaz.de` (the CV editor writes the `Cv*` tables that feed `/cv` and `/about`; the visitor-chats surface is for
    reading what visitors have asked the public assistant). They sit at the bottom because they're touched rarely compared to the personal
    areas above.
  - Routes:
    - CV → `/workspace/cv`
    - Software → `/workspace/software`
    - Projects → `/workspace/projects`
    - Finances → `/workspace/finances`
    - Inventory → `/workspace/inventory`
    - Tax → `/workspace/tax`
    - Fitness → `/workspace/fitness`
    - Medical → `/workspace/medical`
    - Movies & TV → `/workspace/media`
    - Travel → `/workspace/travel`
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

The assistant composer sits **directly under** the hero quote, in normal page flow — not pinned to the bottom of the viewport. It is the
shared `<WorkspaceChatComposer />` (`src/web/chat/WorkspaceChatComposer.tsx`) — the same composer the workspace assistant sheet and
`/workspace/assistant` use — so the **full** admin composer kit is identical across every workspace surface: file attachments (with the
active model gating the accepted media types), the model-selection dropdown (sticky default — picks both the model for the next send and
updates `AdminChatConfig.defaultModelId`), and the tool-call approval-mode selector (Auto / Manual). The hub used to wrap a stripped-down
`<MessageComposer />` that delegated to a provider-owned `openWithMessage(text)`, but that path couldn't carry attachments or a chosen model
— the hub is the workspace's primary affordance, so it gets the same options as the dedicated route. On a typical desktop the quote +
composer occupy the top half of the viewport, so the assistant is the first thing the user sees and the most prominent affordance. The
composer is rendered with `autoFocus` so the textarea is the active element on landing — the user can start typing immediately without
clicking.

Submitting fires `WorkspaceChatMessageCreate` directly (no `chatId`, so the server allocates a fresh row). On the mutation's success the hub
hands the freshly-allocated chatId to the workspace assistant chat provider via `setChatIdFromHub(chatId)` and pops the **workspace
assistant sheet** (the same sheet the header's assistant button on every other workspace page opens) so the streaming response surfaces in
context. The conversation stays in the sheet across navigation between focus areas; clicking **"Open full-screen"** in the sheet's header
navigates to `/workspace/assistant?chatId=<id>` for a dedicated full-screen surface. See [Workspace Chat](./chat-workspace.md) for the
sheet, header entry point, and full-screen jump-off behaviour.

The model catalog + saved default come from `WorkspaceChatConfig`, fetched **once** by the workspace layout loader
(`src/routes/{-$locale}/workspace.tsx`) and passed into `WorkspaceAssistantChatProvider`. Every admin composer reads its `availableModels` /
`selectedModelId` / `onModelChange` from the provider, so a model change on one surface is immediately reflected on the others. The provider
also fire-and-forget persists every change as the new default via `WorkspaceChatConfigDefaultModelSet`.

## `/workspace/assistant`

The dedicated chat surface for the personal assistant. Same shape as the public visitor chat sheet: empty state with the composer, loaded
state with a header, the transcript, and the composer pinned to the bottom. The loaded transcript reads
`sessionFindOne.user.admin.adminChatFindOne(chatId)` so a stolen chatId from the visitor namespace is rejected by `chatFindOne`.

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
- The public landing page (`/`) surfaces a "Workspace" link in the header, but only when the requesting session's user resolves
  `User.admin != null` — non-admin visitors never see the link. The hub is otherwise still reachable only by typing the URL. The site footer
  continues not to link to `/workspace`.
- The `User.admin` resolver (read side) and `guardAdminMutation` (`src/server/guards/guardAdminMutation.ts`, write side) gate the workspace
  namespaces. Both check `isAdmin` on the requesting session's `Users` row — anonymous sessions (which never have a `userId`) bypass to null
  / fail the first check; logged-in non-admin users fail the second. The flag is set manually with a DB `UPDATE` for Cem's own accounts. The
  read side returns null instead of throwing so the landing-page check composes cleanly; the write side throws because there's no
  compositional consumer that needs the soft contract. See [docs/architecture/workspace-access.md](../architecture/workspace-access.md).

See [docs/architecture/workspace-access.md](../architecture/workspace-access.md) for the access model and "Open TODOs" below for the Phase 2
OAuth work.

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
├── inventory.tsx                      → /workspace/inventory
├── tax.tsx                            → /workspace/tax
├── fitness.tsx                        → /workspace/fitness
├── medical.tsx                        → /workspace/medical
├── media.tsx                          → /workspace/media
└── travel.tsx                         → /workspace/travel
```

All page files follow the same shape as `src/routes/{-$locale}/index.tsx` and `src/routes/{-$locale}/datenschutz.tsx`:
`createFileRoute(...)` with a `head()` that returns `seoMeta(...)`, plus a component that reads `useLocale()` and renders the locale's copy.

### Workspace header

Every workspace surface inherits the same chrome: `<WorkspaceHeader />` is mounted once at `src/routes/{-$locale}/workspace.tsx` (the
layout) and renders above the `<Outlet />`. Pages render only their body content — no per-page `<Header />` invocations and no per-page
`← Workspace` back-links.

`WorkspaceHeader` is a thin wrapper around `<Header />` that:

- passes `chatVariant="workspace"` so the chat button opens the personal-assistant sheet,
- passes `hideLanguageSelector` so the language selector doesn't render (the workspace is English-only); the theme selector stays — dark
  mode is a workspace concern too,
- builds a breadcrumb trail from the current pathname against a centralized `WORKSPACE_TITLES` map (path-segment → `{ de, en }` label) in
  the same file. On nested routes (e.g. `/workspace/projects/<id>`) intermediate segments that have a `WORKSPACE_ICONS` entry collapse to a
  linked icon-only crumb — the label stays in `sr-only` so screen readers still announce it. This is what lets the project detail page drop
  its in-page `← Back to board` link: the intermediate `projects` crumb is the way back.
- swaps the trailing-crumb label for a human-readable one when the active route registers a selector in `TRAILING_LABEL_SELECTORS` (route id
  → pluck-from-loader-data). The project detail route uses this to show the project's title instead of its UUID; while the loader is
  resolving the label is empty (just the icon shows) so the raw id never flashes. Long titles ellipsis on overflow so the trail stays on one
  line.

Adding a new `/workspace/<segment>` route: add one entry to `WORKSPACE_TITLES` so the breadcrumb has a label. Everything else is already in
the layout — the page file itself just exports its component. For a new **detail** route that should show a human label instead of an id,
also add an entry to `TRAILING_LABEL_SELECTORS` keyed by the route id.

The `<Header />` primitive grew two props to support this: `breadcrumbs?: ReadonlyArray<Crumb>` (replaces the brand cluster with
`logo + trail`; only the logo is a link, home) and `hideLanguageSelector?: boolean`. The `Crumb` type carries an optional `iconOnly` flag
that `WorkspaceHeader` sets on linked intermediate crumbs. The previous `brandLabel` variant is no longer used by any workspace page but is
kept on the primitive for any future surface that needs `logo + plain label` chrome.

### Hub layout

The hub reuses the same primitives the landing page does:

- `Card` / `CardContent` / `CardTitle` / `CardDescription` from `src/web/components/base/card.tsx`
- `useLocale()` from `src/web/hooks/useLocale.ts`
- `WorkspaceChatComposer` from `src/web/chat/WorkspaceChatComposer.tsx` (the shared admin composer)
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

### Wiring `WorkspaceChatComposer`

`<WorkspaceChatComposer />` (`src/web/chat/WorkspaceChatComposer.tsx`) is a thin admin-namespace wrapper around the generic
`<ChatComposer />`. It pre-wires:

- `sendMutation` → `WorkspaceChatMessageCreateDocument` (admin namespace, so the server dispatches to `agentPersonalAssistant`).
- `extractResult` → reads `data.admin.chatMessageCreate` instead of the visitor `data.chatMessageCreate`.
- `placeholder` → the localized "Ask your assistant…" string.
- `availableModels` / `selectedModelId` / `onModelChange` → all pulled from `useWorkspaceAssistantChat()` so every admin composer (hub,
  sheet, full-screen route) sees the same selection.

Surface-specific props stay on the wrapper: `chatId` (URL-owned on the route, provider-owned on the sheet, omitted on the hub),
`onMessageSent` (navigate on the route, `setChatIdFromHub` on the sheet/hub), and `addonStart` (the sheet's "new chat" button).

`ChatComposer` itself still accepts the same prop passes for non-workspace callers — the public visitor chat sheet
(`WebsiteVisitorAssistantChatSheet`) uses it directly with the default visitor mutation and no model dropdown.

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

- **Phase 2 — OAuth login.** Wrap workspace access in GitHub OAuth (env vars `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`,
  `WORKSPACE_GITHUB_LOGINS`). With OAuth in place, `isAdmin` can be reconciled from the allowlist at login time rather than hand-set in the
  DB — the guards stay the same shape. See [docs/architecture/workspace-access.md](../architecture/workspace-access.md).
- **Phase 2+ — populate focus areas.** Each stub becomes a real surface (per-area notes, lists, integrations) once the gate is in.
- **Follow-up — extract `ChatTranscript`.** The transcript layout in `src/web/chat/WebsiteVisitorAssistantChatSheet.tsx` and
  `src/routes/{-$locale}/workspace/assistant.tsx` is duplicated. Once a third surface needs it, extract to a shared component under
  `src/web/chat/`.
