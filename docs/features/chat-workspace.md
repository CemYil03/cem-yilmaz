# Workspace chat

The workspace personal-assistant chat is the private counterpart to the public visitor chat. It lives in a right-side **Sheet** mounted once
at the workspace layout (`src/routes/{-$locale}/workspace.tsx`), so every workspace page inherits it. The shared `<WorkspaceHeader />` puts
an assistant button in the right-side cluster of every workspace page; that button opens the sheet. The workspace hub's hero composer also
opens it (with the typed message fired as the first turn).

See also:

- [features/chat-visitor.md](./chat-visitor.md) — the parallel public visitor chat. Same primitive (right-side sheet), different agent.
- [features/workspace-hub.md](./workspace-hub.md) — the hub composer that opens this sheet, plus the workspace navigation shell.
- [features/chat.md](./chat.md) — the chat foundation (transcript, composer, live updates) shared by both sheets.
- [architecture/multi-agent-chat.md](../architecture/multi-agent-chat.md) — how visitor and admin chats split at the GraphQL namespace level
  and which agent each one dispatches to.

## Why a sheet (and why one mounted at the workspace layout)

The motivating user behaviour: **"the assistant chats with me while I do other tasks, and I can jump off into a focused full-screen when the
conversation gets long."** A side panel is the right primitive for that — the user is doing something else in the foreground (editing the
CV, reading a focus area, reviewing visitor chats), and the assistant lives alongside it. A modal dialog would force the user to dismiss it
to keep working; a separate route would force a navigation away from the task at hand.

Mounting the provider at the `workspace.tsx` layout — one level above every workspace route — does the rest:

- **The conversation survives navigation.** The user can open the sheet on `/workspace/cv`, ask a question, navigate to
  `/workspace/projects` to consult something, and come back to the sheet with the transcript intact. The provider's `chatId` and the
  `useChatLiveUpdates` listener both live above the `Outlet`, so they survive child unmounts.
- **The SSE subscription survives the sheet closing.** The listener is rendered in the provider, not in the sheet itself, so closing the
  sheet mid-turn does not drop the streaming response. Reopening shows the now-buffered transcript.
- **Workspace-only.** The provider and sheet only mount on `/workspace/*`. Public pages are unaffected; the public-visitor sheet is a
  separate component on a separate provider.

## Surfaces

| Entry point                                                                     | How it opens the sheet                                                           | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace hub composer                                                          | Hub fires `WorkspaceChatMessageCreate`, then calls `setChatIdFromHub` + `open()` | The shared `<WorkspaceChatComposer />` on the hub creates the chat directly so attachments / model / approval mode all ride along, then hands the freshly-allocated id to the provider and pops the sheet so the response surfaces in context.                                                                                                                                                                                                                                                             |
| Header chat button (every workspace page, via the shared `<WorkspaceHeader />`) | `useWorkspaceAssistantChat().open()`                                             | Same right-side cluster button as the public site's visitor-chat button, but on workspace surfaces the header passes `chatVariant="workspace"` (set inside `WorkspaceHeader`) so the button leads to the admin assistant sheet instead of the irrelevant visitor sheet. The header is mounted once at the workspace layout, so every workspace page inherits it. This is the single floating-free entry point on every workspace page; the hub's hero composer is the in-flow alternative on `/workspace`. |
| Sheet's **"Open full-screen"** button                                           | Navigates to `/workspace/assistant?chatId=<id>`                                  | Hands the conversation off to the dedicated full-screen route — the chat row is the same on both sides.                                                                                                                                                                                                                                                                                                                                                                                                    |
| Sheet's recent-chats "View all chats" link                                      | Navigates to `/workspace/assistant`                                              | The empty state's bridge to the dedicated route. Same destination as a fresh-start send: the route's empty state is the at-a-glance list, not a chat-in-progress.                                                                                                                                                                                                                                                                                                                                          |

The provider's API is `WorkspaceAssistantChatContextValue` in `src/web/chat/WorkspaceAssistantChatProvider.tsx`.

## Sheet chrome

Three header buttons on the absolute layer above the title:

| Button           | Position          | Behaviour                                                                                                                                |
| ---------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Open full-screen | `right-12 + 28px` | Closes the sheet and navigates to `/workspace/assistant?chatId=<id>`. The provider keeps the chat alive; the route takes over rendering. |
| Expand (desktop) | `right-12`        | Widens the sheet from `sm:max-w-2xl` to the full viewport. Hidden under `sm`. Inner column capped to `max-w-3xl` for prose.              |
| Close            | `right-4` (Radix) | Closes the sheet. The provider keeps the chat — reopening picks up where the user left off.                                              |

Same iOS keyboard handling as the visitor sheet — the sheet drives `height` and `top` off `window.visualViewport` (via `useVisualViewport`)
on mobile, so the header stays pinned at the top of the visible area and the composer parks just above the soft keyboard.

## Composer

Every admin composer — the hub's hero composer, the sheet's composer, and the empty/loaded composers on `/workspace/assistant` — is the same
`<WorkspaceChatComposer />` (`src/web/chat/WorkspaceChatComposer.tsx`). It is a thin wrapper around the generic `<ChatComposer />` that
pre-wires the workspace `chatMessageCreate` mutation, its admin-namespace result extractor, the "Ask your assistant…" placeholder, and (via
the provider) the shared model catalog, currently-selected model id, and `onModelChange` handler. The wrapper still leaves the
surface-specific pieces — `chatId`, `onMessageSent`, `addonStart`, `autoFocus` — as props. Sharing one composer means the dropdowns,
attachments, and approval-mode selector are identical on every workspace surface, and a model change on one is reflected on the others.

The sheet's instance owns two extras:

- **"Start new chat"** — an icon button rendered into `addonStart` once a chat is active. Clicking it calls the provider's `resetChat()`,
  which drops `chatId` and `loadedMessages` so the next send creates a fresh row. The previous chat is still in the database; the
  recent-chats list (see below) lets the admin resume it from the same surface.
- **Attachments + uploads** — paperclip button + drag-and-drop. The composer owns the upload lifecycle: each picked/dropped file is uploaded
  immediately through `uploadFile()` (`POST /api/file-uploads`), the per-tile UI reflects `uploading` / `uploaded` / `error`, and the
  resolved `fileUploadId`s ride the next `WorkspaceChatMessageCreate` mutation. Errored tiles stay on screen so the user can decide whether
  to remove-and-retry; only `uploaded` ids ride the mutation.

The sheet's instance reads the provider's `chatId` and uses `setChatIdFromHub` as its `onMessageSent` handler, so the first send adopts the
freshly-allocated chatId into the provider — every subsequent send from any admin composer reuses the same row.

## Page context

Every `WorkspaceChatMessageCreate` carries a `currentPagePath` argument — the workspace route the user was on when they hit Send
(`/workspace/projects`, `/workspace/projects/<projectId>`, `/workspace/cv`, `/workspace/visitor-chats`, …). Each surface that mounts
`<WorkspaceChatComposer />` reads `useLocation().pathname` and passes it through: the sheet composer reads it inside
`WorkspaceAssistantComposer`, the hub composer reads it in `WorkspaceHub`, and the dedicated route reads it in both the empty and loaded
components. Server-side, the path is threaded through `chatMessageCreate` → `chatAssistantTurnRunDetached` → the `agentPersonalAssistant`
factory, which inlines it into the system prompt for that turn only. Nothing is persisted.

The win is that short references resolve against the right surface: "this project" on `/workspace/projects/abc…` is the project whose id
encodes in the path, and "what am I looking at" on `/workspace/projects` is the projects board. The agent is told the path is the only
signal — no rendered DOM, no row payload — so it must not invent specifics it wasn't otherwise given. It already has
`delegateToProjects` to fetch the live board snapshot when it actually needs structured project data.

## Recent chats

The sheet's empty state and the dedicated route both render the last 10 admin chats so the user can resume a conversation in place instead
of routing back through a list. The list is driven by the lightweight `WorkspaceAssistantChats` query (admin namespace, metadata only — no
transcript). Both surfaces:

- Use `cache-and-network` so a fresh send bumps the resumed chat to the top of the list on the next visit without a hard reload.
- Slice client-side to `RECENT_CHATS_LIMIT = 10`. The cap is mirrored on both surfaces — they graduate together when the list grows.
- Resume a row through different code paths: the sheet calls `loadChat(chatId)` on the provider (fetches the transcript, seeds
  `loadedMessages`), while the route navigates to `/workspace/assistant?chatId=<id>` and lets its own page-query take over.

On the loaded route, a sidebar (lg+ only) shows the same recent-chats list with the active chat highlighted so the user can switch
conversations without bouncing through the empty state. The sidebar is hidden under `lg` — the row is the primary surface on narrow
viewports, and the sheet is one tap away.

The route locks its `<main>` to `h-[calc(100dvh-5rem)]` (the workspace header eats the missing 5rem of flow) so the page is the size of one
viewport rather than growing with the transcript. The transcript wrapper takes the leftover space as `flex-1 min-h-0` and scrolls
internally; the composer parks at the bottom — standard chat-surface posture. Without the explicit `dvh` clamp, the workspace shell's
`min-h-screen` (a minimum, not a fixed height) would let the page grow past the viewport once the transcript filled, and the composer would
ride that growth instead of staying glued to the bottom edge.

## Full-screen route handoff

Clicking "Open full-screen" in the sheet:

1. Closes the sheet via `setOpen(false)`.
2. Navigates to `/workspace/assistant?chatId=<id>` (or `?chatId=undefined` if no chat has started yet).
3. The route reads `chatId` from the URL search and takes over — empty state when none, loaded transcript when set.

The button is **disabled while a turn is streaming**. Reason: the dedicated route page mounts its own `useChatLiveUpdates(chatId)`, which
only listens to a `generationId` it allocates itself. The sheet's in-flight stream is on a different `generationId` (the provider's), so
handing off mid-stream would leave the route page showing the persisted transcript up to the navigation moment plus a missing tail until the
user sends the next message. Forcing the hand-off to between-turn moments side-steps that — by the time the button re-enables, the turn has
already persisted, and the route's `WorkspaceChatPage` query (`cache-and-network`) picks up the full transcript on mount.

The provider does NOT drop its `chatId` on the navigation — if the user navigates back to a workspace page (the hub, a focus area), the
header's assistant button is one click away and reopening shows the same conversation. The route page is the source of truth for "is this
chat bookmark-able", and the provider is the source of truth for "is there a chat happening right now."

## Files

```
src/web/chat/
├── WorkspaceAssistantChatProvider.tsx    Provider — owns chatId, live updates, sticky model selection, setChatIdFromHub, resetChat, loadChat.
├── WorkspaceAssistantChatSheet.tsx       Sheet — transcript + composer + header chrome (open-full-screen, expand, close).
└── WorkspaceChatComposer.tsx             Shared admin composer — wraps `<ChatComposer />` with the workspace mutation + provider-owned model selection.

src/routes/{-$locale}/
└── workspace.tsx                         Workspace layout — loads `WorkspaceChatConfig`, wraps `<Outlet />` in the provider, mounts the sheet.
```

## Mutations

All mutations go through the `admin.*` namespace so the server dispatches to `agentPersonalAssistant`:

- `WorkspaceChatMessageCreate` — first send creates a new admin-scope chat; subsequent sends append to it.
- `WorkspaceChatInputCollectionRespond` — answer an interactive collection inside the sheet's transcript.
- `WorkspaceChatToolApprovalRespond` — approve / decline a tool call when the agent runs with `requireToolCallApprovals: true`.

`requireToolCallApprovals` is set per send by the composer's approval-mode dropdown — Auto fires the mutation with `false`, Manual with
`true`. The dropdown lives in the shared `<WorkspaceChatComposer />`, so every admin surface (hub, sheet, full-screen route) exposes the
same toggle.

## Transcript affordances tied to the agent-delegation pattern

Two surface-level conveniences flow from [`architecture/agent-delegation.md`](../architecture/agent-delegation.md):

- **Deep links to workspace rows.** Whenever the assistant mentions a project, inbox row, task, or visitor chat, the orchestrator
  (`agentPersonalAssistant`) is prompted to format it as a markdown link with a `?focus=<id>` search param. The destination page scrolls the
  matching row into view and flashes it for ~1500ms before dropping the param. The links appear in the assistant-text bubbles in this sheet
  just like any other markdown — `<AssistantMarkdown>` renders them through Streamdown. See
  [Deep links](../architecture/agent-delegation.md#deep-links).
- **Nested tool-call rows.** When the orchestrator delegates project work to its sub-agent, the resulting `delegateToProjects` tool-call row
  in the transcript shows the sub-agent's own tool calls (`projectsList`, `projectUpsert`, `taskUpsert`, …) indented under it. The user
  reads "Created project X" plus the actual sequence of DB writes that produced it. See
  [Nested tool calls](../architecture/agent-delegation.md#nested-tool-calls).

## Anti-patterns avoided

- **No second `useChatLiveUpdates` in the sheet.** The listener lives once in the provider, not in the sheet, so the SSE stream is immune to
  the sheet's mount/unmount cycle.
- **No `chatId` in the sheet's URL.** The sheet is an overlay; the URL is for routes. The full-screen button is the bridge: it puts `chatId`
  into a real search param and navigates.
- **No back-button trap.** Opening the sheet does not push history. Closing it (X, Escape, click outside) just dismisses the overlay and the
  user is exactly where they were.
