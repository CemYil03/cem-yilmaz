# Workspace Hub

The private side of cem-yilmaz.de is a personal workspace. Phase 1 ships the **navigation hub** — a single landing page that lists the focus
areas Cem actively works on and prominently hosts the personal-assistant composer. Per-area features land in later phases.

## User Behavior

- `/workspace` (DE) and `/en/workspace` (EN) render the hub: a slimmed-down header (logo links home, the word "Workspace" sits beside it as
  inert text instead of the public "Cem Yilmaz" wordmark — the page already knows whose workspace it is), a small muted motivational quote
  (see "Hero quote" below), the personal-assistant composer directly under the quote, and a **bento-style focus-area grid** below that. The
  composer scrolls with the page — it is **not** pinned to the viewport bottom; on a typical desktop the composer is already on-screen at
  load, and pinning it overlapped the last row of focus cards behind a progressive blur, which read as "the input is parked on top of my
  last tile."
- Sending a message from the hub composer creates a new admin-scope chat and navigates to `/workspace/assistant?chatId=<id>`, where the rest
  of the conversation happens. The hub itself stays a hub — every visit lands on the empty composer again.
- The focus-area cards in Phase 1 are:
  - CV → `/workspace/cv`
  - Software & architecture → `/workspace/software`
  - Projects → `/workspace/projects`
  - Finances → `/workspace/finances`
  - Tax → `/workspace/tax`
  - Fitness → `/workspace/fitness`
  - Medical → `/workspace/medical`
  - Movies & TV → `/workspace/media`
  - Visitor chats → `/workspace/visitor-chats`
- Each focus-area page is a placeholder: a back link to `/workspace`, the area name + icon, a one-line "this area is being built out" body,
  and a muted "Coming soon" line.
- The language switcher in the header swaps between `/workspace` and `/en/workspace`.

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

The assistant composer sits **directly under** the hero quote, in normal page flow — not pinned to the bottom of the viewport. It's a
`ChatComposer` (the same component that powers the visitor chat dialog on `/`) wired through `useChatLiveUpdates`. On a typical desktop the
quote + composer occupy the top half of the viewport, so the assistant is the first thing the user sees and the most prominent affordance —
the same priority the old sticky placement was trying to encode, just without the side-effect of overlapping the focus-area cards. Removing
the sticky composer also removed the `ProgressiveBlurBottom` field and the 256px bottom padding `<main>` used to reserve; neither was
carrying weight once the composer left the bottom of the viewport. The composer is fully functional — it accepts attachments, supports the
auto/manual tool-approval mode toggle, and locks during an in-flight turn. It is rendered with `autoFocus` so the textarea is the active
element on landing — the user can start typing immediately without clicking. `/workspace/assistant` (both empty and loaded states) continues
to use a `sticky bottom-4` composer because a transcript scrolling above an input is a different layout problem from a launcher beside a nav
grid.

The composer is configured to talk to the **personal-assistant agent** by passing the `WorkspaceChatMessageCreate` mutation document and a
matching result extractor to `ChatComposer`. That mutation goes through `Mutation.admin.chatMessageCreate`, which the server dispatches to
`agentPersonalAssistant` (see `docs/architecture/multi-agent-chat.md`). The public visitor chat (in the landing-page dialog) is unaffected —
`ChatComposer`'s defaults still target the visitor namespace.

On first send the hub navigates to `/workspace/assistant?chatId=<new id>`. Because `useChatLiveUpdates` was mounted on the hub before the
mutation fired, the user message and the first streaming chunks of the assistant reply are already buffered when the loaded view takes over
— no perceptible "loading then a flash" gap.

## `/workspace/assistant`

The dedicated chat surface for the personal assistant. Same shape as the public visitor chat dialog: empty state with the composer, loaded
state with a header, the transcript, and the composer pinned to the bottom. The loaded transcript reads `Query.admin.chat(chatId)` so a
stolen chatId from the visitor namespace is rejected by `chatFindByScope`.

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

### Hub layout

The hub reuses the same primitives the landing page does:

- `Card` / `CardContent` / `CardTitle` / `CardDescription` from `src/web/components/base/card.tsx`
- `Header` from `src/web/components/Header.tsx` — invoked with `brandLabel="Workspace"` so the brand cluster renders as `logo + "Workspace"`
  rather than the public `logo + "Cem Yilmaz"` wordmark; only the logo is a link (back to `/{-$locale}`), the label itself is inert text.
- `useLocale()` from `src/web/hooks/useLocale.ts`
- `ChatComposer` from `src/web/chat/ChatComposer.tsx` (parameterized with the workspace mutation)
- `useChatLiveUpdates` from `src/web/chat/useChatLiveUpdates.tsx` (namespace-agnostic)

A single `COPY` constant at the top of the file keys every visible string under `{ de, en }`. This follows the inline-bilingual-copy pattern
from `docs/architecture/i18n.md` — no translation library.

The cards are driven by a small `FOCUS_AREAS` array (`{ key, to, icon, size }`) so adding a new focus area is one entry plus one new file
plus one new copy block. Each card is a real `<Link>` to its stub route and uses a Lucide icon.

**Bento sizing.** On `lg`+ the grid is 6 columns and each card declares a span via its `size`: `primary` (CV, Software — 3/6 each so two sit
on a row), `standard` (the daily/weekly areas — 2/6 each, three per row), `wide` (Visitor chats — 6/6, the full row). On `md` it collapses
to 2 columns and the spans drop out; on `sm` it stacks to one column. This breaks the "8 identical tiles in a 2-col wall" silhouette the
previous layout had on wide viewports — daily-use areas get more visual weight, the observational visitor-chats surface takes the bottom row
by itself, and the whole grid fits without the page needing to scroll past one viewport on a typical desktop.

**Card content.** Each card is icon + title on one row, a one-line description below, and an `ArrowUpRightIcon` tucked in the top-right
corner that brightens and translates on hover. The previous "Öffnen → / Open →" labelled-button row was redundant with the entire card being
a `<Link>`; removing it cut a row of vertical space per card without losing affordance — the cursor change on hover, the corner arrow, and
the card-wide hover state all still read as "this is clickable."

### Stub layout

Each focus-area stub has its own `COPY` constant (title, description, body, "coming soon", "back" label) and a single `<main>` block: back
link → icon + h1 → body paragraph → muted "Coming soon" line. They are intentionally tiny — the goal of Phase 1 is for the navigation to
exist, not for the rooms to be furnished.

### Wiring `ChatComposer` to the admin namespace

`ChatComposer` accepts three optional props that turn it from a visitor-only widget into a namespace-agnostic one:

- `sendMutation` — the `chatMessageCreate` document to call. Defaults to the visitor `ChatMessageCreateDocument`. The hub and the workspace
  assistant route pass `WorkspaceChatMessageCreateDocument` instead.
- `extractResult` — pulls `{ chatId }` out of the mutation result. The visitor default reads `data.chatMessageCreate`; the workspace callers
  pass an extractor that reads `data.admin.chatMessageCreate`.
- `placeholder` — localized placeholder string. Defaults to `"Type a message…"`.

The visitor chat dialog on the landing page (`WebsiteVisitorAssistantChatDialog`) is unchanged — it doesn't pass any of these and gets the
visitor defaults.

### SEO

Every workspace route passes `noindex: true` to `seoMeta()`. The shared canonical URL and `hreflang` alternates still render correctly via
`webPageUrlGet()` so a directly-shared link resolves cleanly, but the page is not indexed and not in the sitemap. See
`docs/architecture/seo.md` for the underlying conventions.

## Adding a new focus area

1. Add a new entry to `COPY.areas` in `src/routes/{-$locale}/workspace/index.tsx` (DE + EN copy).
2. Add a new entry to `FOCUS_AREAS` in the same file (key, route path, icon, size — `primary` / `standard` / `wide`).
3. Create a new stub file under `src/routes/{-$locale}/workspace/` mirroring one of the existing stubs (`software.tsx`, etc.). Use the same
   `COPY` shape and `seoMeta({ ..., noindex: true })`.
4. Do **not** add the new path to `SITEMAP_PATHS` — workspace routes stay out of the sitemap until they are public.

## Open TODOs

- **Phase 2 — OAuth gate.** Wrap `/workspace/*` behind GitHub OAuth (env vars `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`,
  `WORKSPACE_GITHUB_LOGINS`). The README and `AGENTS.md` already document the env vars; the gate itself does not exist yet. `guardAdmin` and
  `guardAdminMutation` are the files that flip from permissive to allowlist-checked.
- **Phase 2+ — populate focus areas.** Each stub becomes a real surface (per-area notes, lists, integrations) once the gate is in.
- **Follow-up — extract `ChatTranscript`.** The transcript layout in `src/web/chat/WebsiteVisitorAssistantChatDialog.tsx` and
  `src/routes/{-$locale}/workspace/assistant.tsx` is duplicated. Once a third surface needs it, extract to a shared component under
  `src/web/chat/`.
