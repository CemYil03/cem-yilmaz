# Workspace chat

The workspace personal-assistant chat is the private counterpart to the public visitor chat. It is mounted once at the workspace layout
(`src/routes/{-$locale}/workspace.tsx`) as a persistent right-side **sidebar** that lives **alongside** every workspace surface, so Cem can
ask the assistant a question and keep editing/reading without dismissing anything.

The sidebar is built on shadcn's `<Sidebar collapsible="offcanvas" side="right">` primitive (`src/web/components/base/sidebar.tsx`). That
primitive owns the responsive split, the cookie-backed open state, the keyboard shortcut, and — on `<md` viewports — an internal right-side
Sheet. No bespoke wrapper of any of these is needed. `collapsible="offcanvas"` (rather than `icon`) means collapsing slides the sidebar
fully off the right edge — there is no leftover icon rail, the workspace surface gets the full inset width back.

| Viewport | Surface                                                            | State source                                            |
| -------- | ------------------------------------------------------------------ | ------------------------------------------------------- |
| `md+`    | Inline sidebar; collapsing slides it fully off-canvas to the right | shadcn's `useSidebar().open` (cookie `sidebar_state`)   |
| `<md`    | Full-viewport right-side Sheet rendered by shadcn's `<Sidebar>`    | shadcn's `useSidebar().openMobile` (in-memory per load) |

On phones the mobile Sheet is forced to full viewport width (`max-md:!w-screen max-md:!max-w-none` on `<Sidebar>`) — the primitive's
`w-3/4 sm:max-w-sm` default leaves a chat surface too narrow to type in, so we override it for this consumer.

The default width matches the previous Sheet (`sm:max-w-2xl` ≈ 42rem / 672px). The user can drag the sidebar's left edge outward to widen it
up to ~960px; the width is persisted to `localStorage` (`workspaceAssistantSidebar.widthPx`) so the preference survives reloads. Dragging
inward past the default is clamped — "narrower" trades real estate without giving back enough room to matter, and the assistant button is
the way to dismiss it instead.

The shared `<WorkspaceHeader />` puts an assistant button in the right-side cluster of every workspace page. The button calls
`useSidebar().toggleSidebar()` — same affordance on both viewports. The workspace hub's hero composer forces the sidebar open on first send
so the streaming response surfaces in context.

See also:

- [features/chat-visitor.md](./chat-visitor.md) — the parallel public visitor chat. Different primitive (right-side Sheet), different agent.
- [features/chat-web-search.md](./chat-web-search.md) — the admin assistant's Google Search grounding tool. Not on the visitor agent.
- [features/workspace-hub.md](./workspace-hub.md) — the hub composer that seeds the sidebar, plus the workspace navigation shell.
- [features/chat.md](./chat.md) — the chat foundation (transcript, composer, live updates) shared by every surface.
- [architecture/multi-agent-chat.md](../architecture/multi-agent-chat.md) — how visitor and admin chats split at the GraphQL namespace level
  and which agent each one dispatches to.

## Why a persistent sidebar

The motivating user behaviour: **"the assistant chats with me while I do other tasks, and I can open a specific chat in its own page when I
want to focus on it."** The right primitive for that is a persistent column — the user is doing something else in the foreground (editing
the CV, reading a focus area, reviewing visitor chats), and the assistant lives alongside it without any open/close dance. A modal dialog
forces the user to dismiss it to keep working; an overlay Sheet covers the page the user is operating on. shadcn's `<Sidebar>` is
specifically a docked column primitive and is the right tool here.

Mounting the chat provider and `<SidebarProvider>` at `workspace.tsx` — one level above every workspace route — does the rest:

- **The conversation survives navigation.** The user can ask a question on `/workspace/cv`, navigate to `/workspace/projects` to consult
  something, and come back with the transcript intact. `WorkspaceAssistantChatProvider` owns `chatId`, `loadedMessages`, and the
  `useChatLiveUpdates` listener above the `Outlet`, so they survive child unmounts.
- **The SSE subscription survives surface transitions.** The listener is rendered in the chat provider, not in the sidebar itself, so
  collapsing the sidebar or dismissing the mobile Sheet mid-turn does not drop the streaming response. Reopening shows the now-buffered
  transcript.
- **Workspace-only.** Both providers only mount on `/workspace/*`. Public pages are unaffected; the public-visitor Sheet is a separate
  component on a separate provider.

## Layout

```tsx
<WorkspaceAssistantChatProvider chatConfig={chatConfig}>
  <SidebarProvider defaultOpen={false}>
    <SidebarInset className="flex min-h-screen flex-col">
      <WorkspaceHeader />
      <Outlet />
    </SidebarInset>
    <WorkspaceAssistantChatSidebar locale={locale} />
  </SidebarProvider>
</WorkspaceAssistantChatProvider>
```

`<SidebarInset>` is the main content frame; `<Sidebar side="right">` docks to the right edge. shadcn's primitive shifts a transparent "gap"
sibling in the layout so `<SidebarInset>` reflows automatically as the sidebar collapses/expands — no flex math on this side.

## Surfaces

| Entry point                                                                     | Behaviour                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace hub composer                                                          | Hub fires `WorkspaceChatMessageCreate`, then calls `setChatIdFromHub` on the chat provider, then forces the sidebar open via `useSidebar().setOpen(true)` (or `setOpenMobile(true)` on `<md`). The user sees the streaming response without any extra navigation.                                                                                                   |
| Header chat button (every workspace page, via the shared `<WorkspaceHeader />`) | `useSidebar().toggleSidebar()`. On `md+` this flips the cookie-backed open state; on `<md` it opens/closes shadcn's internal Sheet. The button reads `open` / `openMobile` from `useSidebar` and surfaces the current state as `aria-pressed` so screen readers and the visual pressed style both reflect "the sidebar is here."                                    |
| Sidebar chat browser row                                                        | User clicks a row in the sidebar's chat list; provider fires `loadChat(chatId)` which fetches the transcript and seeds `loadedMessages`. The sidebar's own `hasActiveChat` flag flips true so the transcript replaces the browser column in place.                                                                                                                  |
| Sidebar chat browser row — hover "Open in its own page"                         | A hover-revealed `↗` icon on the right of every row hands off to the deep-link route directly, skipping the sidebar peek. Same sequence as the loaded-state affordance below: close the sidebar, `resetChat()`, navigate. The row reserves right-side padding so the icon has its own lane; `focus-visible` also reveals it so keyboard users can reach it via Tab. |
| Sidebar loaded-state "Back to chats"                                            | Small in-transcript link that calls `resetChat()` on the provider. Drops `chatId + loadedMessages` and the browser reappears.                                                                                                                                                                                                                                       |
| Sidebar loaded-state "Open in its own page"                                     | Closes the sidebar (mobile Sheet or desktop dock), resets the provider (`resetChat`) so the same conversation isn't showing in two places, then navigates to `/workspace/assistant/<chatId>`. Disabled while a turn is streaming — the deep-link route mounts its own `useChatLiveUpdates` on a fresh `generationId` and can't observe the in-flight sidebar turn.  |
| Deep-link route `/workspace/assistant/<chatId>`                                 | URL-driven, bookmark-friendly view of one chat. Reads the chatId from the path, loads the transcript with `WorkspaceChatPage(chatId)`, renders a `max-w-3xl` reading column with the shared composer at the bottom. No landing/index page — a fresh chat starts from the hub composer.                                                                              |

The chat provider's API is `WorkspaceAssistantChatContextValue` in `src/web/chat/WorkspaceAssistantChatProvider.tsx`. It owns chat-layer
state only — `chatId`, `loadedMessages`, `live`, the recent-chat resume helpers, the sticky model. Sidebar open/close/collapsed state lives
on shadcn's `useSidebar()`.

## Sidebar chrome

The sidebar renders, top to bottom:

| Slot               | Contents                                                                                                                                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<SidebarHeader>`  | Title row (sparkle glyph + "Personal assistant" + one-line subtitle) and a "Hide assistant" button (`<PanelRightCloseIcon />`) that calls `useSidebar().toggleSidebar()`.                                                                                           |
| `<SidebarContent>` | Two surfaces gated on `hasActiveChat`. Without a chat: the chat browser — a search input plus a paginated list of past chats. With a chat: a "Back to chats" / "Open in its own page" row followed by the transcript. Owns its own scroll containers.               |
| `<SidebarFooter>`  | The shared `<WorkspaceChatComposer />`. Always mounted — a user can start typing without first navigating out of the browser, and the composer's first send simply creates a new chat (adopting the freshly-allocated id into the provider via `setChatIdFromHub`). |

A 2px drag handle sits on the sidebar's left edge (`md+` only). Pulling it leftward widens the sidebar; pulling it rightward narrows it back
down to the 42rem default. The new width is committed to `localStorage` on pointer release, so reloads keep the user's chosen width.

During a drag the handle sets `data-resizing="true"` on the `<SidebarProvider>` wrapper. The sidebar primitive
(`src/web/components/base/sidebar.tsx`) gates its `transition-[width]` / `transition-[left,right,width]` rules on that attribute and
switches them off while the flag is set, so the sidebar edge tracks the pointer 1:1 instead of chasing through a 200ms ease per
`pointermove`. The flag is removed on pointer release, restoring the open/close animation.

The browser / transcript / composer bodies are in `src/web/chat/WorkspaceAssistantChatBody.tsx` so the sidebar is purely the frame.

## Chat browser

When no chat is loaded, the sidebar's content column shows a chat browser: a search input at the top, a paginated list of admin chats
underneath, day-bucketed (`Today` / `Yesterday` / `This week` / `Earlier`) so a wall of "vor N Stunden" rows collapses into scannable
sections. Bucketing lives in `src/web/chat/workspaceChatListBuckets.ts`.

The list is backed by the `WorkspaceAssistantChatsPage(limit, offset, query)` GraphQL query, which reads two sibling fields on `Admin` —
`chats(limit, offset, query)` for the current page's shells and `chatsCount(query)` for the total — both resolved by
`src/server/queries/adminChats.ts`:

- **Search.** When `query` is set, the server matches EITHER the chat title OR any user-message body (case-insensitive `ILIKE '%…%'` with
  `%` / `_` / `\` escaped). Assistant text is intentionally NOT searched — the intent of "find the chat where I said X" is anchored on the
  user's own words, not the model's paraphrase. The client debounces typing by 300ms (`SEARCH_DEBOUNCE_MS`) so a keystroke doesn't fire a
  request per character; a fresh query resets pagination. `chats` and `chatsCount` share one predicate helper so the two fields cannot drift
  on filter semantics.
- **Pagination.** The client asks for `CHATS_PAGE_SIZE = 10` rows on first render. "Show more" grows the requested `limit` by 10 (same
  offset 0, urql caches the smaller subset) so a single query drives the whole grown list rather than concatenating pages on the client. The
  client compares `chats.length` against `chatsCount` to gate the "Show more" button — cheaper than a `limit + 1` peek and it also lets us
  surface the total elsewhere without another round-trip. `MAX_LIMIT = 20` at the server clamps a runaway `limit`; grow it in lock-step with
  the client's page size if the browser ever renders more per screen. All three arguments on `Admin.chats` are optional so the field is
  drop-in for a plain "list every admin chat" call.
- **Reactivity.** `cache-and-network` request policy — a fresh send updates `lastModifiedAt`, and the next time the browser mounts (or urql
  revalidates in-place) the resumed chat reorders to the top without a hard reload.

Row click calls `loadChat(chatId)` on the provider, which fetches the transcript via `WorkspaceChatPage(chatId)` and seeds `loadedMessages`.
The sidebar's `hasActiveChat` gate flips true and the transcript replaces the browser in place. "Back to chats" (small link at the top of
the transcript) resets the provider and the browser is back.

Every row also carries a **hover-revealed `↗` action** on its right edge. It's the same hand-off the loaded-state header uses (see below) —
close the sidebar, `resetChat()`, navigate to `/workspace/assistant/<chatId>` — but wired directly onto the row so users who want the
reading column can skip the peek. The row reserves right-side padding so the icon has its own lane and doesn't crowd the title or the date
underneath it; keyboard users reach the same button via Tab (`focus-visible` reveals it too). The icon click calls `stopPropagation` so it
doesn't also fire the outer peek. Both the row peek and the loaded-state header route through the same `useOpenChatStandalone` hook in
`WorkspaceAssistantChatBody.tsx`, so the "one chat visible in one place" invariant is enforced at a single call site.

## Deep-link route

`/workspace/assistant/<chatId>` (`src/routes/{-$locale}/workspace/assistant.$chatId.tsx`) is a URL-driven view of one chat —
bookmark-friendly, sharable, refresh-safe. Layout: the transcript centered on `max-w-3xl` and the shared composer parked at the viewport
bottom. The chat title lives in the workspace header's trailing breadcrumb (via `WorkspaceHeader`'s `TRAILING_LABEL_SELECTORS`) — the
in-page header is gone so the reading column starts at the top with no redundant title bar, and the "Workspace" crumb is the only "back"
affordance. Untitled chats (titler hasn't run yet) fall back to "Untitled" in the crumb rather than exposing the raw id.

Fresh chats start from the workspace hub composer (`/workspace`) — the sidebar covers "resume an existing chat", the hub covers "start a new
one", so this route needs no landing / index sibling and no in-page "New chat" button.

Clicking "Open in its own page" in the sidebar's loaded-state header dismisses the sidebar (mobile Sheet or desktop dock) and calls
`resetChat()` on the provider before navigating to `/workspace/assistant/<chatId>`. Without that reset the same conversation would render
twice — once in the docked column, once inline in the newly-mounted route — and returning to a workspace page later would silently restore
the just-handed-off chat in the sidebar. From the click onward the URL is the source of truth; the sidebar is empty next time it opens. The
button is **disabled while a turn is streaming** — the deep-link route mounts its own `useChatLiveUpdates(chatId)` on a fresh `generationId`
and can't pick up the sidebar's in-flight stream, so we force the hand-off to a between-turn moment.

## Composer

Every admin composer — the hub's hero composer, the sidebar's composer, and the composer on the deep-link route — is the same
`<WorkspaceChatComposer />` (`src/web/chat/WorkspaceChatComposer.tsx`). It is a thin wrapper around the generic `<ChatComposer />` that
pre-wires the workspace `chatMessageCreate` mutation, its admin-namespace result extractor, the "Ask your assistant…" placeholder, and (via
the chat provider) the shared model catalog, currently-selected model id, and `onModelChange` handler.

The sidebar's instance owns two extras (both in `WorkspaceAssistantChatComposer` in `WorkspaceAssistantChatBody.tsx`):

- **"Start new chat"** — an icon button rendered into `addonStart` once a chat is active. Clicking it calls the provider's `resetChat()`,
  which drops `chatId` and `loadedMessages` so the next send creates a fresh row.
- **Attachments + uploads** — paperclip button + drag-and-drop. The composer owns the upload lifecycle: each picked/dropped file is uploaded
  immediately through `uploadFile()` (`POST /api/file-uploads`), the per-tile UI reflects `uploading` / `uploaded` / `error`, and the
  resolved `fileUploadId`s ride the next `WorkspaceChatMessageCreate` mutation.

The sidebar reads the provider's `chatId` and uses `setChatIdFromHub` as its `onMessageSent` handler, so the first send adopts the
freshly-allocated chatId into the provider — every subsequent send from any admin composer reuses the same row.

## Page context

Every `WorkspaceChatMessageCreate` carries a `currentPagePath` argument — the workspace route the user was on when they hit Send
(`/workspace/projects`, `/workspace/projects/<projectId>`, `/workspace/cv`, `/workspace/visitor-chats`, …). Each surface that mounts
`<WorkspaceChatComposer />` reads `useLocation().pathname` and passes it through. Server-side, the path is threaded through
`chatMessageCreate` → `chatAssistantTurnRunDetached` → the `agentPersonalAssistant` factory, which inlines it into the system prompt for
that turn only. Nothing is persisted.

The win is that short references resolve against the right surface: "this project" on `/workspace/projects/abc…` is the project whose id
encodes in the path, and "what am I looking at" on `/workspace/projects` is the projects board. The agent is told the path is the only
signal — no rendered DOM, no row payload — so it must not invent specifics it wasn't otherwise given. It already has `delegateToProjects` to
fetch the live board snapshot when it actually needs structured project data.

## Files

```
src/web/chat/
├── WorkspaceAssistantChatProvider.tsx    Chat provider — owns chatId, live updates, sticky model, resume helpers.
├── WorkspaceAssistantChatBody.tsx        Sidebar body — chat browser (search + paginated list), loaded-state header ("Back to chats" + "Open in its own page"), transcript, composer.
├── WorkspaceAssistantChatSidebar.tsx     The shadcn `<Sidebar collapsible="offcanvas" side="right">` frame.
├── WorkspaceChatComposer.tsx             Shared admin composer — wraps `<ChatComposer />` with the workspace mutation + provider-owned model selection.
├── ChatTranscriptShared.tsx              Shared transcript renderer (MessageScroller-backed) — used here, in the deep-link route, and in the visitor sheet. See docs/architecture/chat-transcript.md.
└── workspaceChatListBuckets.ts           Day-bucketing helper (`Today` / `Yesterday` / `This week` / `Earlier`) used by the sidebar's chat browser.

src/web/components/
└── HeaderChatButton.tsx                  Workspace variant calls `useSidebar().toggleSidebar()` and reads `open` / `openMobile` for `aria-pressed`.

src/web/components/base/
├── sidebar.tsx                           shadcn's Sidebar primitive (registry, do not modify casually).
├── message-scroller.tsx                  shadcn's MessageScroller primitive (registry) — backs `<ChatTranscript />`.
├── marker.tsx                            shadcn's Marker primitive (registry) — used for the transcript's date separators.
└── attachment.tsx                        shadcn's Attachment primitive (registry) — used by the composer's file tiles.

src/routes/{-$locale}/
├── workspace.tsx                         Workspace layout — loads `WorkspaceChatConfig`, mounts `WorkspaceAssistantChatProvider` + `<SidebarProvider>` + `<SidebarInset>` + `<WorkspaceAssistantChatSidebar />`.
└── workspace/assistant.$chatId.tsx       Deep-link route — URL-driven view of one chat by id.

src/server/queries/
└── adminChats.ts                     Paged + searchable admin chat browser feed. Exports `adminChats` (list) and `adminChatsCount` (total for the same filter). `ILIKE` on title OR any user-message body; the two share one predicate helper so they cannot drift.
```

## Mutations

All mutations go through the `admin.*` namespace so the server dispatches to `agentPersonalAssistant`:

- `WorkspaceChatMessageCreate` — first send creates a new admin-scope chat; subsequent sends append to it.
- `WorkspaceChatInputCollectionRespond` — answer an interactive collection inside the sidebar's transcript.
- `WorkspaceChatToolApprovalRespond` — approve / decline a tool call when the agent runs with `requireToolCallApprovals: true`.

`requireToolCallApprovals` is set per send by the composer's approval-mode dropdown — Auto fires the mutation with `false`, Manual with
`true`. The dropdown lives in the shared `<WorkspaceChatComposer />`, so every admin surface (hub, sidebar, deep-link route) exposes the
same toggle.

## Transcript affordances tied to the agent-delegation pattern

Two surface-level conveniences flow from [`architecture/agent-delegation.md`](../architecture/agent-delegation.md):

- **Deep links to workspace rows.** Whenever the assistant mentions a project, inbox row, task, or visitor chat, the orchestrator
  (`agentPersonalAssistant`) is prompted to format it as a markdown link with a `?focus=<id>` search param. The destination page scrolls the
  matching row into view and flashes it for ~1500ms before dropping the param. The links appear in the assistant-text bubbles in the sidebar
  just like any other markdown — `<AssistantMarkdown>` renders them through Streamdown. See
  [Deep links](../architecture/agent-delegation.md#deep-links).
- **Nested tool-call rows.** When the orchestrator delegates project work to its sub-agent, the resulting `delegateToProjects` tool-call row
  in the transcript shows the sub-agent's own tool calls (`projectsList`, `projectUpsert`, `taskUpsert`, …) indented under it. The user
  reads "Created project X" plus the actual sequence of DB writes that produced it. See
  [Nested tool calls](../architecture/agent-delegation.md#nested-tool-calls).

## Transcript scroll behaviour

Every admin surface — the sidebar body, the deep-link route, and (with the visitor sheet) the public "Ask me anything" surface — renders its
transcript through the shared `<ChatTranscript />` at `src/web/chat/ChatTranscriptShared.tsx`. The scroll behaviour (follow-only-while-
at-the-live-edge, anchor new turns near the top of the viewport, reopen saved conversations at the last user message, edge fade on the
bottom of the viewport, jump-to-latest pill) is delegated to shadcn's `MessageScroller` primitive. See
[`architecture/chat-transcript.md`](../architecture/chat-transcript.md).

## Anti-patterns avoided

- **No second `useChatLiveUpdates` in the sidebar.** The listener lives once in the chat provider, not in the sidebar, so the SSE stream is
  immune to the sidebar's collapse/expand and the mobile Sheet's open/close cycles.
- **No `chatId` in the sidebar's URL.** The sidebar is an in-page surface; the URL is for routes. "Open in its own page" is the bridge — it
  closes the sidebar and resets the provider before navigating to `/workspace/assistant/<chatId>`, so the chat is only on screen in one
  place at a time.
- **No landing route.** `/workspace/assistant` is no longer a page; a fresh chat starts from the hub composer, and existing chats live under
  `/workspace/assistant/<chatId>`. Cuts the duplicate "how do I start" surface and lets the sidebar own chat browsing.
- **No back-button trap.** Toggling the sidebar's rail or opening the mobile Sheet does not push history.
- **No custom sidebar primitive.** We use shadcn's `<Sidebar collapsible="offcanvas" side="right">` directly. The theme tokens (`--sidebar`,
  `--sidebar-accent`, `--sidebar-ring`, …) are already wired in `src/styles.css`; the cookie persistence, keyboard shortcut, and mobile
  Sheet all come for free.
