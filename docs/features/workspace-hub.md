# Workspace Hub

The private side of cem-yilmaz.de is a personal workspace. The **navigation hub** is a single landing page that lists the focus areas the
admin works on and prominently hosts the personal-assistant composer. Each focus area is a **shipped** surface (not a placeholder). Per-area
behavior is documented in the matching `docs/features/workspace-*.md` files; CV, visitor chats, and logs live in adjacent feature docs
([cv.md](./cv.md), [chat-visitor.md](./chat-visitor.md), [workspace-logs.md](./workspace-logs.md)).

Sidebar chat behaviour (open/close, deep-link hand-off, mobile Sheet owned by shadcn's `<Sidebar>`) is owned by
[chat-workspace.md](./chat-workspace.md) — this doc only covers how the hub seeds that sidebar.

## User Behavior

- `/workspace` (DE) and `/en/workspace` (EN) render the hub in an **AI-app shell**: a slimmed-down workspace header (logo links home, a
  breadcrumb trail to the right shows where you are inside the workspace, and the assistant chat button plus theme selector sit on the right
  — the language selector is intentionally absent because the workspace is English-only), then a **scroll region** holding a small muted
  motivational quote (see "Hero quote" below) followed by the **focus-area grid**, and the personal-assistant composer **pinned to the
  viewport bottom** below the scroll region. The tiles scroll behind the composer bar (with a `scroll-fade-b` feather into it); the composer
  never scrolls. This mirrors the loaded chat surface (`/workspace/assistant/<chatId>`): a bounded-height `main` (`h-[calc(100dvh-5rem)]` —
  the header's ~5rem flow rail subtracted), a `flex-1 min-h-0` scroll child, and the composer as the fixed-height sibling under it. The
  earlier layout scrolled the composer with the page in normal flow; parking it at the bottom makes the hub read like the rest of the
  assistant surfaces — the input is always reachable and the tiles are a scrollable catalogue above it.
- Sending a message from the hub composer creates a new admin-scope chat, hands the id to the workspace assistant chat provider via
  `setChatIdFromHub(chatId)`, and forces the **workspace assistant sidebar** open (`useSidebar().setOpen(true)` on `md+`, or
  `setOpenMobile(true)` on `<md`) so the streaming response surfaces in context. The hub itself stays a hub — every visit lands on the empty
  composer again. Full sidebar / deep-link behaviour: [chat-workspace.md](./chat-workspace.md).
- The focus-area cards are split into two subgroups:
  - **Personal areas** (top): Compass, Projects, Todos, Tax, Software, Finances, Inventory, Fitness, Nutrition, Medical, Movies & TV, Travel
    — the daily-use surfaces.
  - **Public site** (bottom, under a small muted "Öffentliche Website / Public site" heading): CV, Visitor chats, Logs. These manage or
    inspect what appears on / relates to the public `cem-yilmaz.de` (the CV editor writes the `Cv*` tables that feed `/cv` and `/about`;
    visitor chats review what visitors asked the public assistant; logs inspect server log rows). They sit at the bottom because they're
    touched rarely compared to the personal areas above.
  - Routes:
    - Compass → `/workspace/compass`
    - Projects → `/workspace/projects`
    - Todos → `/workspace/todos`
    - Tax → `/workspace/tax`
    - Software → `/workspace/software`
    - Finances → `/workspace/finances`
    - Inventory → `/workspace/inventory`
    - Fitness → `/workspace/fitness`
    - Nutrition → `/workspace/nutrition`
    - Medical → `/workspace/medical`
    - Movies & TV → `/workspace/media`
    - Travel → `/workspace/travel`
    - CV → `/workspace/cv`
    - Visitor chats → `/workspace/visitor-chats`
    - Logs → `/workspace/logs`
- Focus-area pages are real surfaces with their own editors, lists, and loaders — not "Coming soon" stubs. No per-page back-link — the
  workspace header's breadcrumb trail is the way back to `/workspace`.
- Projects and Todos tiles can show small numeric badges (inbox count / open-todo count) when the hub loader returns non-zero values.
- The language switcher is hidden on workspace surfaces (the workspace is single-user private chrome; the locale toggle belongs to the
  public site). To switch locale, return to a public page via the logo.

## Hero quote

Above the focus-area grid sits a rotating motivational quote — replacing the static personalized welcome greeting that used to live there. A
generic welcome was wallpaper; the quote is a quiet motivational beat at the top of the hub. It is **rendered small and muted on purpose**
(body-text size, italic, `text-muted-foreground`) — it is not the focus of the workspace; the assistant composer and the focus-area grid
are. The list lives in `src/web/content/workspaceQuotes.ts` as `{ de, en, attribution? }` triples (the admin's own lines + a handful of
well-known entrepreneurial / resilience quotes). Edited via PR, same pattern as `personalInfo.ts` and `portfolioProjects.ts`.

Selection is **deterministic per UTC day** via `workspaceQuotePick()` — `dayOfYear % quotes.length`. Two consequences:

- SSR and hydration agree without a `useEffect` flash on first paint.
- Navigating back to `/workspace` later in the same day shows the same line; the quote is decoration, not churn-content.

The visible element is a `<blockquote>`, not an `<h1>` — wrapping a quote in h1 reads oddly to screen readers and pins the document outline
to whatever line landed today. A visually-hidden `<h1>Workspace</h1>` keeps the page semantically identifiable for assistive tech without
putting that string into the visual hierarchy. The browser-tab title and `seoMeta` description are unchanged.

## Personal-assistant composer

The assistant composer is **pinned to the bottom of the viewport**, below the scrollable focus-area grid — the AI-app shell described under
"User Behavior". It is the shared `<WorkspaceChatComposer />` (`src/web/chat/WorkspaceChatComposer.tsx`) — the same composer the workspace
assistant sidebar and `/workspace/assistant/<chatId>` use — so the **full** admin composer kit is identical across every workspace surface:
file attachments (with the active model gating the accepted media types), the model-selection dropdown (sticky default — picks both the
model for the next send and updates `AdminChatConfig.defaultModelId`), and the tool-call approval-mode selector (Auto / Manual). The hub
used to wrap a stripped-down `<MessageComposer />` that delegated to a provider-owned `openWithMessage(text)`, but that path couldn't carry
attachments or a chosen model — the hub is the workspace's primary affordance, so it gets the same options as the dedicated route. Because
the composer is always parked at the bottom, the assistant input is reachable without scrolling regardless of how far down the tile
catalogue the user has scrolled. The composer is rendered with `autoFocus` so the textarea is the active element on landing — the user can
start typing immediately without clicking.

Submitting fires `WorkspaceChatMessageCreate` directly (no `chatId`, so the server allocates a fresh row). On the mutation's success the hub
hands the freshly-allocated chatId to the workspace assistant chat provider via `setChatIdFromHub(chatId)` and forces the **workspace
assistant sidebar** open so the streaming response surfaces in context. The conversation stays in the sidebar across navigation between
focus areas; **"Open in its own page"** navigates to `/workspace/assistant/<chatId>` (path param — not `?chatId=`). See
[chat-workspace.md](./chat-workspace.md) for sidebar, header entry point, and deep-link hand-off behaviour.

The model catalog + saved default come from `WorkspaceChatConfig`, fetched **once** by the workspace layout loader
(`src/routes/{-$locale}/workspace.tsx`) and passed into `WorkspaceAssistantChatProvider`. Every admin composer reads its `availableModels` /
`selectedModelId` / `onModelChange` from the provider, so a model change on one surface is immediately reflected on the others. The provider
also fire-and-forget persists every change as the new default via `WorkspaceChatConfigDefaultModelSet`.

## `/workspace/assistant/<chatId>`

The dedicated deep-link chat surface for the personal assistant (`src/routes/{-$locale}/workspace/assistant.$chatId.tsx`). Same shape as
other AI-app shells: loaded state with a header, the transcript, and the composer pinned to the bottom. The loaded transcript reads
`sessionFindOne.user.admin.adminChatFindOne(chatId)` so a stolen chatId from the visitor namespace is rejected by `chatFindOne`.

There is **no** `/workspace/assistant` index route — a fresh chat starts from the hub composer; existing chats live under
`/workspace/assistant/<chatId>`. This route is the **bookmark-able** form of a conversation that also lives in the sidebar. The sidebar's
"Open in its own page" affordance hands the active `chatId` off via normal navigation to that path. See
[chat-workspace.md](./chat-workspace.md).

The route is `noindex`, kept out of the sitemap, and unlinked from the public site — same posture as the rest of `/workspace/*`.

## Auth and visibility

`/workspace/*` is gated by the current session's `userId` resolving to a `Users` row with `isAdmin = true`. There is no separate login flow
— the flag is set manually in the DB for admin accounts. To keep the surface non-public:

- All workspace routes pass `noindex: true` to `seoMeta()`. Each page emits `<meta name="robots" content="noindex,nofollow">`, so search
  engines do not list them.
- None of the workspace paths are added to `SITEMAP_PATHS` in `src/web/seo/sitemapRoutes.ts`. The convention there is explicit: noindex /
  logged-in / transactional pages stay out of the sitemap.
- The public landing page (`/`) surfaces a "Workspace" link in the header, but only when the requesting session's user resolves
  `User.admin != null` — non-admin visitors never see the link. The hub is otherwise still reachable only by typing the URL. The site footer
  continues not to link to `/workspace`.
- The `User.admin` resolver (read side) and `guardAdminMutation` (`src/server/guards/guardAdminMutation.ts`, write side) gate the workspace
  namespaces. Both check `isAdmin` on the requesting session's `Users` row — anonymous sessions (which never have a `userId`) bypass to null
  / fail the first check; logged-in non-admin users fail the second. The read side returns null instead of throwing so the landing-page
  check composes cleanly; the write side throws because there's no compositional consumer that needs the soft contract. See
  [docs/architecture/authorization-workspace.md](../architecture/authorization-workspace.md).

See [docs/architecture/authorization-workspace.md](../architecture/authorization-workspace.md) for the access model.

## Options considered

### Hub shell vs scrolling page

1. **Normal document flow** (composer scrolls with the tiles). Rejected: the hub is the primary place to start a chat; burying the input
   under a long tile catalogue made "ask something" feel secondary to navigation.
2. **AI-app shell** (chosen) — bounded-height `main`, scrollable catalogue, composer pinned as the sibling below it. Matches
   `/workspace/assistant/<chatId>` and keeps the input always reachable.

### Focus-area presentation

1. **Coming-soon placeholders** for every tile. Rejected once the areas shipped — a stub page undercuts the hub as a real jump-off.
2. **Single mixed grid** with bento spans encoding priority. Rejected: tile size as a proxy for "daily vs rare" was harder to read than an
   explicit labelled split.
3. **Two labelled subgroups** (chosen) — personal areas on top, public-site management below. Uniform tile size inside each subgroup.

### Assistant surface on send

1. **Navigate away to a dedicated chat route** on every hub send. Rejected: breaks the "keep working in the workspace" posture.
2. **Overlay Sheet as the only in-context surface.** Rejected in favour of the persistent sidebar — see
   [chat-workspace.md](./chat-workspace.md).
3. **Open the workspace assistant sidebar** (chosen) — `setChatIdFromHub` + `useSidebar().setOpen` / `setOpenMobile`. Deep work still has
   `/workspace/assistant/<chatId>`.

## Option chosen

Ship the hub as an AI-app shell with a two-subgroup focus-area grid of real routes, bilingual strings on the `FocusArea` objects (and inline
`{ de, en }[locale]` at other call sites), and a shared composer that seeds the layout-owned assistant sidebar. Defer sidebar / deep-link
detail to [chat-workspace.md](./chat-workspace.md). Keep workspace chrome English-only via `hideLanguageSelector`, and keep every workspace
path `noindex` and out of the sitemap.

## Implementation Details

### Files

```
src/routes/{-$locale}/workspace.tsx                 → layout (header, sidebar providers, Outlet)
src/routes/{-$locale}/workspace/
├── index.tsx                                       → /workspace (hub + assistant composer)
├── index.graphql                                   hub badge counts
├── assistant.$chatId.tsx                           → /workspace/assistant/<chatId>
├── WorkspaceAssistantPage.graphql                  admin-namespace chat operations
├── compass.tsx                                     → /workspace/compass
├── WorkspaceCompassPage.graphql
├── projects.tsx                                    → /workspace/projects
├── projects.graphql
├── projects_.$projectId.tsx                        → /workspace/projects/<projectId>
├── projects_.$projectId.graphql
├── todos.tsx                                       → /workspace/todos
├── todos.graphql
├── tax.tsx                                         → /workspace/tax
├── tax.graphql
├── software.tsx                                    → /workspace/software
├── software.graphql
├── finances.tsx                                    → /workspace/finances
├── finances.graphql
├── inventory.tsx                                   → /workspace/inventory
├── inventory.graphql
├── inventory_.$itemId.tsx                          → /workspace/inventory/<itemId>
├── inventory_.$itemId.graphql
├── fitness.tsx                                     → /workspace/fitness
├── fitness.graphql
├── nutrition.tsx                                   → /workspace/nutrition
├── nutrition.graphql
├── medical.tsx                                     → /workspace/medical
├── medical.graphql
├── media.tsx                                       → /workspace/media
├── media.graphql
├── travel.tsx                                      → /workspace/travel
├── travel.graphql
├── travel_.$tripId.tsx                             → /workspace/travel/<tripId>
├── travel_.$tripId.graphql
├── cv.tsx                                          → /workspace/cv
├── cv.graphql
├── visitor-chats.tsx                               → /workspace/visitor-chats
├── VisitorChatsAdminPage.graphql
├── logs.tsx                                        → /workspace/logs
└── LogsAdminPage.graphql
```

Page files follow the shared route shape: `createFileRoute(...)` with a `head()` that returns `seoMeta(...)` (always `noindex: true`), plus
a component that reads `useLocale()` where bilingual chrome is needed.

### Workspace header

Every workspace surface inherits the same chrome: `<WorkspaceHeader />` is mounted once at `src/routes/{-$locale}/workspace.tsx` (the
layout) and renders above the `<Outlet />`. Pages render only their body content — no per-page `<Header />` invocations and no per-page
`← Workspace` back-links.

`WorkspaceHeader` is a thin wrapper around `<Header />` that:

- passes `chatVariant="workspace"` so the chat button toggles the personal-assistant sidebar,
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

The hub reuses shared primitives:

- `GlassCard` plus `CardContent` / `CardTitle` / `CardDescription` from `src/web/components/`
- `useLocale()` from `src/web/hooks/useLocale.ts`
- `WorkspaceChatComposer` from `src/web/chat/WorkspaceChatComposer.tsx` (the shared admin composer)
- `useSidebar()` from `src/web/components/base/sidebar.tsx` (force-open on hub send)
- `useWorkspaceAssistantChat()` for `setChatIdFromHub` / live-turn helpers

The header is **not** invoked by the hub itself — it comes from `<WorkspaceHeader />` mounted at the layout (see "Workspace header" above).
The hub's component body is a bounded-height `main` split into two children: a `flex-1 min-h-0` scroll region (the `sr-only` "Workspace" h1,
the `HeroQuote`, and the focus-area grid) and a `shrink-0` composer bar pinned below it.

Bilingual copy follows the repo convention: inline `{ de: '…', en: '…' }[locale]` at call sites (section headings, aria-labels, badge
narration). Focus-area titles and descriptions live on the `FocusArea` objects in `PERSONAL_FOCUS_AREAS` / `PUBLIC_SITE_FOCUS_AREAS` in
`index.tsx` — there is **no** page-level `COPY` const. A small named `title` const is shared by `seoMeta()` and the visually-hidden `<h1>`.

The cards are driven by those two `FocusArea[]` arrays (`{ to, icon, title, description, badgeKey? }`) and a shared `<FocusCardGrid />` that
renders one subgroup at uniform tile size with a parameterized columns class. Adding a new focus area is one entry to the right array plus
one new route file (and breadcrumb / docs updates — see below).

**Two-subgroup layout.** The grid is split into a top "personal" subgroup and a bottom "public site" subgroup, separated by vertical spacing
and a small muted `<h2>` + one-line subtitle marking the boundary. Inside each subgroup every tile is the same size — the previous bento
with `primary` / `standard` / `wide` spans encoded a daily-vs-rare priority across one combined grid, but reading the layout as one flow
obscured that CV / Visitor chats / Logs are content-management (or ops) surfaces for the public site rather than daily personal areas.
Splitting them into a labelled cluster at the bottom makes that grouping legible without relying on tile size as a proxy for it.

**Tile sizing.** Personal subgroup: 1 column by default, 2 on `md`, 3 on `xl`, 4 on `2xl` (`xl:grid-cols-3 2xl:grid-cols-4`) — jumping
straight to 4 columns at `lg` made German one-word titles too narrow. Public-site subgroup: 2 columns from `lg` (`lg:grid-cols-2`). Card
heights are uniform inside a subgroup (`auto-rows-fr`) because every card has the same icon + title + one-line description layout.

**Card content.** Each card is icon + title on one row (optional count badge), a one-line description below, and an `ArrowUpRightIcon`
tucked in the top-right corner that brightens and translates on hover. The previous "Öffnen → / Open →" labelled-button row was redundant
with the entire card being a `<Link>`; removing it cut a row of vertical space per card without losing affordance.

### Page chrome

Focus-area pages do not render their own header, back-link, or on-page title row; the workspace header above the outlet provides the
breadcrumb (with the focus area's icon on the trailing crumb), so a duplicate `icon + h1` inside the page would only repeat what the chrome
already shows. The breadcrumb-with-icon contract is owned by `Header`'s `Crumb` type and rendered by `WorkspaceHeader` via `WORKSPACE_ICONS`
— see `src/web/components/WorkspaceHeader.tsx`. Per-area behavior lives in the matching feature doc.

### Wiring `WorkspaceChatComposer`

`<WorkspaceChatComposer />` (`src/web/chat/WorkspaceChatComposer.tsx`) is a thin admin-namespace wrapper around the generic
`<ChatComposer />`. It pre-wires:

- `sendMutation` → `WorkspaceChatMessageCreateDocument` (admin namespace, so the server dispatches to `agentPersonalAssistant`).
- `extractResult` → reads `data.admin.chatMessageCreate` instead of the visitor `data.chatMessageCreate`.
- `placeholder` → the localized "Ask your assistant…" string.
- `availableModels` / `selectedModelId` / `onModelChange` → all pulled from `useWorkspaceAssistantChat()` so every admin composer (hub,
  sidebar, deep-link route) sees the same selection.

Surface-specific props stay on the wrapper: `chatId` (URL-owned on the deep-link route, provider-owned on the sidebar, omitted on the hub),
`onMessageSent` (navigate on the route, `setChatIdFromHub` on the sidebar/hub), and sidebar extras such as the "new chat" control.

`ChatComposer` itself still accepts the same prop passes for non-workspace callers — the public visitor chat sheet
(`WebsiteVisitorAssistantChatSheet`) uses it directly with the default visitor mutation and no model dropdown.

### SEO

Every workspace route passes `noindex: true` to `seoMeta()`. The shared canonical URL and `hreflang` alternates still render correctly via
`webPageUrlGet()` so a directly-shared link resolves cleanly, but the page is not indexed and not in the sitemap. See
`docs/architecture/discovery-seo.md` for the underlying conventions.

## Adding a new focus area

1. Add a new entry to either `PERSONAL_FOCUS_AREAS` (daily-use surfaces) or `PUBLIC_SITE_FOCUS_AREAS` (content that feeds / relates to the
   public site) in `src/routes/{-$locale}/workspace/index.tsx`, with bilingual `title` / `description` on the `FocusArea` object itself
   (`{ de, en }`). Extend the `FocusAreaRoute` union with the new path. If you're adding a third subgroup, factor a new array +
   `<FocusCardGrid />` invocation in `FocusAreaGrid` and pick an appropriate columns class for its width.
2. Create the route under `src/routes/{-$locale}/workspace/` (mirror a sibling focus-area page). Pass `seoMeta({ ..., noindex: true })`. The
   page does **not** render its own `<Header />` or back-link — both come from the layout.
3. Add the new path-segment to `WORKSPACE_TITLES` in `src/web/components/WorkspaceHeader.tsx` so the breadcrumb has a label, and to
   `WORKSPACE_ICONS` in the same file so the trailing crumb gets the same Lucide icon used on the hub tile.
4. Do **not** add the new path to `SITEMAP_PATHS` — workspace routes stay out of the sitemap.
5. Document the surface in `docs/features/workspace-{name}.md` (or the appropriate adjacent feature doc for public-site / cross-cutting
   surfaces).
