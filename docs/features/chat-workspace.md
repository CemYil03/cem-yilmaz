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

The motivating user behaviour: **"the assistant chats with me while I do other tasks, and I can jump off into a focused full-screen when the
conversation gets long."** The right primitive for that is a persistent column — the user is doing something else in the foreground (editing
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

| Entry point                                                                     | Behaviour                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace hub composer                                                          | Hub fires `WorkspaceChatMessageCreate`, then calls `setChatIdFromHub` on the chat provider, then forces the sidebar open via `useSidebar().setOpen(true)` (or `setOpenMobile(true)` on `<md`). The user sees the streaming response without any extra navigation.                                                                |
| Header chat button (every workspace page, via the shared `<WorkspaceHeader />`) | `useSidebar().toggleSidebar()`. On `md+` this flips the cookie-backed open state; on `<md` it opens/closes shadcn's internal Sheet. The button reads `open` / `openMobile` from `useSidebar` and surfaces the current state as `aria-pressed` so screen readers and the visual pressed style both reflect "the sidebar is here." |
| Sidebar **"Open full-screen"** button                                           | Closes the sidebar (mobile Sheet or desktop dock), resets the provider so the same conversation isn't showing in two places, then navigates to `/workspace/assistant?chatId=<id>`. Disabled while a turn is streaming (see "Full-screen route handoff").                                                                         |
| Empty-state "View all chats" link                                               | Closes the sidebar and resets the provider (same reason as "Open full-screen"), then navigates to `/workspace/assistant`. The empty state's bridge to the dedicated route.                                                                                                                                                       |

The chat provider's API is `WorkspaceAssistantChatContextValue` in `src/web/chat/WorkspaceAssistantChatProvider.tsx`. It owns chat-layer
state only — `chatId`, `loadedMessages`, `live`, the recent-chat resume helpers, the sticky model. Sidebar open/close/collapsed state lives
on shadcn's `useSidebar()`.

## Sidebar chrome

The sidebar renders, top to bottom:

| Slot               | Contents                                                                                                                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<SidebarHeader>`  | Title row (sparkle glyph + "Personal assistant" + one-line subtitle), an "Open full-screen" button, and a "Hide assistant" button (`<PanelRightCloseIcon />`) that calls `useSidebar().toggleSidebar()`. |
| `<SidebarContent>` | The shared chat body — empty state with recent-chats list, or transcript when populated. Owns its own scroll container.                                                                                  |
| `<SidebarFooter>`  | The shared `<WorkspaceChatComposer />`.                                                                                                                                                                  |

A 2px drag handle sits on the sidebar's left edge (`md+` only). Pulling it leftward widens the sidebar; pulling it rightward narrows it back
down to the 42rem default. The new width is committed to `localStorage` on pointer release, so reloads keep the user's chosen width.

During a drag the handle sets `data-resizing="true"` on the `<SidebarProvider>` wrapper. The sidebar primitive
(`src/web/components/base/sidebar.tsx`) gates its `transition-[width]` / `transition-[left,right,width]` rules on that attribute and
switches them off while the flag is set, so the sidebar edge tracks the pointer 1:1 instead of chasing through a 200ms ease per
`pointermove`. The flag is removed on pointer release, restoring the open/close animation.

The transcript / empty state / composer are in `src/web/chat/WorkspaceAssistantChatBody.tsx` so the sidebar is purely the frame.

## Composer

Every admin composer — the hub's hero composer, the sidebar's composer, and the empty/loaded composers on `/workspace/assistant` — is the
same `<WorkspaceChatComposer />` (`src/web/chat/WorkspaceChatComposer.tsx`). It is a thin wrapper around the generic `<ChatComposer />` that
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

## Recent chats

The sidebar's empty state and the dedicated route both render the last 10 admin chats so the user can resume a conversation in place instead
of routing back through a list. The list is driven by the lightweight `WorkspaceAssistantChats` query (admin namespace, metadata only — no
transcript). Both surfaces:

- Use `cache-and-network` so a fresh send bumps the resumed chat to the top of the list on the next visit without a hard reload.
- Slice client-side to `RECENT_CHATS_LIMIT = 10`. The cap is mirrored across surfaces.
- Resume a row through different code paths: the sidebar calls `loadChat(chatId)` on the chat provider (fetches the transcript, seeds
  `loadedMessages`), while the route navigates to `/workspace/assistant?chatId=<id>` and lets its own page-query take over.

## Full-screen route handoff

Clicking "Open full-screen" in the sidebar navigates to `/workspace/assistant?chatId=<id>` (or `?chatId=undefined` if no chat has started
yet). The route reads `chatId` from the URL search and takes over — empty state when none, loaded transcript when set.

The button is **disabled while a turn is streaming**. Reason: the dedicated route page mounts its own `useChatLiveUpdates(chatId)`, which
only listens to a `generationId` it allocates itself. The sidebar's in-flight stream is on a different `generationId` (the provider's), so
handing off mid-stream would leave the route page showing the persisted transcript up to the navigation moment plus a missing tail until the
user sends the next message. Forcing the hand-off to between-turn moments side-steps that — by the time the button re-enables, the turn has
already persisted, and the route's `WorkspaceChatPage` query (`cache-and-network`) picks up the full transcript on mount.

On hand-off the sidebar **closes itself and calls `resetChat()` on the provider**. Without that reset, the same conversation would render
twice — once inline in the newly-mounted `/workspace/assistant` page and once floating in the still-open dock — and navigating back to a
workspace page would silently restore the just-handed-off chat in the sidebar. The route's URL is the source of truth from the click onward;
the sidebar starts empty next time it's opened.

## Files

```
src/web/chat/
├── WorkspaceAssistantChatProvider.tsx    Chat provider — owns chatId, live updates, sticky model, recent-chat resume.
├── WorkspaceAssistantChatBody.tsx        Shared body — transcript, empty state, composer. Reusable so the same code renders inside the sidebar's expanded column and (in future) any other host.
├── WorkspaceAssistantChatSidebar.tsx     The shadcn `<Sidebar collapsible="icon" side="right">` frame.
└── WorkspaceChatComposer.tsx             Shared admin composer — wraps `<ChatComposer />` with the workspace mutation + provider-owned model selection.

src/web/components/
└── HeaderChatButton.tsx                  Workspace variant calls `useSidebar().toggleSidebar()` and reads `open` / `openMobile` for `aria-pressed`.

src/web/components/base/
└── sidebar.tsx                           shadcn's Sidebar primitive (registry, do not modify casually).

src/routes/{-$locale}/
└── workspace.tsx                         Workspace layout — loads `WorkspaceChatConfig`, mounts `WorkspaceAssistantChatProvider` + `<SidebarProvider>` + `<SidebarInset>` + `<WorkspaceAssistantChatSidebar />`.
```

## Mutations

All mutations go through the `admin.*` namespace so the server dispatches to `agentPersonalAssistant`:

- `WorkspaceChatMessageCreate` — first send creates a new admin-scope chat; subsequent sends append to it.
- `WorkspaceChatInputCollectionRespond` — answer an interactive collection inside the sidebar's transcript.
- `WorkspaceChatToolApprovalRespond` — approve / decline a tool call when the agent runs with `requireToolCallApprovals: true`.

`requireToolCallApprovals` is set per send by the composer's approval-mode dropdown — Auto fires the mutation with `false`, Manual with
`true`. The dropdown lives in the shared `<WorkspaceChatComposer />`, so every admin surface (hub, sidebar, full-screen route) exposes the
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

## Anti-patterns avoided

- **No second `useChatLiveUpdates` in the sidebar.** The listener lives once in the chat provider, not in the sidebar, so the SSE stream is
  immune to the sidebar's collapse/expand and the mobile Sheet's open/close cycles.
- **No `chatId` in the sidebar's URL.** The sidebar is an in-page surface; the URL is for routes. The full-screen button is the bridge: it
  puts `chatId` into a real search param and navigates.
- **No back-button trap.** Toggling the sidebar's rail or opening the mobile Sheet does not push history.
- **No custom sidebar primitive.** We use shadcn's `<Sidebar collapsible="icon" side="right">` directly. The theme tokens (`--sidebar`,
  `--sidebar-accent`, `--sidebar-ring`, …) are already wired in `src/styles.css`; the cookie persistence, keyboard shortcut, and mobile
  Sheet all come for free.
