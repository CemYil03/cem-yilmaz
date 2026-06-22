# Workspace Hub

The private side of cem-yilmaz.de is a personal workspace. Phase 1 ships the **navigation hub** — a single landing page that lists the focus
areas Cem actively works on and prominently hosts the personal-assistant composer. Per-area features land in later phases.

## User Behavior

- `/workspace` (DE) and `/en/workspace` (EN) render the hub: header, hero ("Welcome back, Cem" / "Willkommen zurück, Cem" + a one-line
  intro), a 2-column grid of focus-area cards, and a muted "Mehr folgt." / "More to come." line under the grid. The personal-assistant
  composer is **pinned to the bottom of the viewport** (sticky) so it stays reachable as the focus-area grid scrolls past — the same posture
  as the loaded `/workspace/assistant` view, just without a transcript above it.
- Sending a message from the hub composer creates a new admin-scope chat and navigates to `/workspace/assistant?chatId=<id>`, where the rest
  of the conversation happens. The hub itself stays a hub — every visit lands on the empty composer again.
- The cards in Phase 1 are:
  - Software development & architecture → `/workspace/software`
  - Projects → `/workspace/projects`
  - Finances → `/workspace/finances`
  - Tax → `/workspace/tax`
  - Fitness & well-being → `/workspace/fitness`
  - Medical → `/workspace/medical`
  - Movies & TV shows → `/workspace/media`
- Each focus-area page is a placeholder: a back link to `/workspace`, the area name + icon, a one-line "this area is being built out" body,
  and a muted "Coming soon" line.
- The language switcher in the header swaps between `/workspace` and `/en/workspace`.

## Personal-assistant composer

The hub greeting and the assistant composer are paired but not nested:

- A bilingual greeting (`Willkommen zurück, Cem` / `Welcome back, Cem`) at the same h1 size the hub previously used for "Workspace".
- A one-line subtitle inviting Cem to either ask the assistant or pick a focus area below.
- A `ChatComposer` (the same component that powers the visitor chat dialog on `/`) wired through `useChatLiveUpdates`. The composer is
  rendered as a sibling of `<main>` with `sticky bottom-4` so it stays anchored to the bottom of the viewport as the page scrolls — the
  mirror image of the `sticky top-4` `Header`. `<main>` carries `pb-40` to reserve space so the focus-area grid is never hidden underneath.
  A `ProgressiveBlurBottom` (a vertical mirror of the `ProgressiveBlurTop` field above the `Header` — five stacked fixed layers, each
  blurring more than the one above and masked to fade out as it approaches the composer) sits at `z-40` directly under the composer (`z-50`)
  so scrolling page content fades into a soft blur as it approaches the composer instead of sliding behind it in sharp focus. The bottom
  field is **tuned differently** from the top one: it's taller (`h-64` vs `h-32`) and the per-layer mask `to` values are pulled higher (the
  64px layer reaches 65% up the field instead of 20%) so every layer — including the strongest — is still partially active at the composer's
  top edge. The Header's curve concentrates the strongest blur at the very bottom of the viewport, which here would sit invisibly behind the
  composer's opaque `bg-white`; the composer's curve instead peaks at the composer's top edge so the fade-out happens above it, where it's
  actually visible. The composer is fully functional from the hub — it accepts attachments, supports the auto/manual tool-approval mode
  toggle, and locks during an in-flight turn. It is rendered with `autoFocus` so the textarea is the active element on landing — the user
  can start typing immediately without clicking. `/workspace/assistant` (both empty and loaded states) uses the same `autoFocus` for
  symmetry.

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
- `Header` from `src/web/components/Header.tsx`
- `useLocale()` from `src/web/hooks/useLocale.ts`
- `ChatComposer` from `src/web/chat/ChatComposer.tsx` (parameterized with the workspace mutation)
- `useChatLiveUpdates` from `src/web/chat/useChatLiveUpdates.tsx` (namespace-agnostic)

A single `COPY` constant at the top of the file keys every visible string under `{ de, en }`. This follows the inline-bilingual-copy pattern
from `docs/architecture/i18n.md` — no translation library.

The cards are driven by a small `FOCUS_AREAS` array (`{ key, to, icon }`) so adding a new focus area is one entry plus one new file plus one
new copy block. Each card is a real `<Link>` to its stub route and uses a Lucide icon (`CodeXmlIcon`, `WalletIcon`, `StethoscopeIcon`,
`DumbbellIcon`, `FilmIcon`).

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
2. Add a new entry to `FOCUS_AREAS` in the same file (key, route path, icon).
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
