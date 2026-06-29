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

| Entry point                                                                     | How it opens the sheet                              | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace hub composer                                                          | `useWorkspaceAssistantChat().openWithMessage(text)` | Hub composer fires the typed message as the first turn; the conversation continues in the sheet.                                                                                                                                                                                                                                                                                                                                                                                                           |
| Header chat button (every workspace page, via the shared `<WorkspaceHeader />`) | `useWorkspaceAssistantChat().open()`                | Same right-side cluster button as the public site's visitor-chat button, but on workspace surfaces the header passes `chatVariant="workspace"` (set inside `WorkspaceHeader`) so the button leads to the admin assistant sheet instead of the irrelevant visitor sheet. The header is mounted once at the workspace layout, so every workspace page inherits it. This is the single floating-free entry point on every workspace page; the hub's hero composer is the in-flow alternative on `/workspace`. |
| Sheet's **"Open full-screen"** button                                           | Navigates to `/workspace/assistant?chatId=<id>`     | Hands the conversation off to the dedicated full-screen route — the chat row is the same on both sides.                                                                                                                                                                                                                                                                                                                                                                                                    |
| Sheet's recent-chats "View all chats" link                                      | Navigates to `/workspace/assistant`                 | The empty state's bridge to the dedicated route. Same destination as a fresh-start send: the route's empty state is the at-a-glance list, not a chat-in-progress.                                                                                                                                                                                                                                                                                                                                          |

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

The sheet's composer is `WorkspaceAssistantComposer`, a small wrapper around `<MessageComposer />` that submits into the provider's
`sendMessage(text, fileUploadIds?)`. The provider owns the `chatId`, the live-updates hook, the mutation, and the chat-id ref that makes
back-to-back sends append to the same `chats` row (the same pattern `VisitorChatProvider` uses).

The composer has two addon-start controls:

- **"Start new chat"** — an icon button that appears once a chat is active. Clicking it calls `resetChat()`, which drops `chatId` and
  `loadedMessages` so the next send creates a fresh row. The previous chat is still in the database; the recent-chats list (see below) lets
  the admin resume it from the same surface.
- **Attachments** — paperclip button + drag-and-drop. The composer owns the upload lifecycle: each picked/dropped file is uploaded
  immediately through `uploadFile()` (`POST /api/file-uploads`), the per-tile UI reflects `uploading` / `uploaded` / `error`, and the
  resolved `fileUploadId`s are forwarded through `sendMessage(message, fileUploadIds)` on submit. The provider's mutation passes the ids to
  the `admin.chatMessageCreate` resolver, same shape as the route composer's path. Errored tiles stay on screen so the user can decide
  whether to remove-and-retry; only `uploaded` ids ride the mutation.

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
├── WorkspaceAssistantChatProvider.tsx    Provider — owns chatId, live updates, sendMessage, resetChat, loadChat.
└── WorkspaceAssistantChatSheet.tsx       Sheet — transcript + composer + header chrome (open-full-screen, expand, close).

src/routes/{-$locale}/
└── workspace.tsx                         Workspace layout — wraps `<Outlet />` in the provider and mounts the sheet.
```

## Mutations

All mutations go through the `admin.*` namespace so the server dispatches to `agentPersonalAssistant`:

- `WorkspaceChatMessageCreate` — first send creates a new admin-scope chat; subsequent sends append to it.
- `WorkspaceChatInputCollectionRespond` — answer an interactive collection inside the sheet's transcript.
- `WorkspaceChatToolApprovalRespond` — approve / decline a tool call when the agent runs with `requireToolCallApprovals: true`.

`requireToolCallApprovals` defaults to `false` on the sheet's composer (auto-mode). The dedicated `/workspace/assistant` route exposes the
auto/manual selector via the shared `<ChatComposer />`; the sheet keeps the surface minimal.

## Anti-patterns avoided

- **No second `useChatLiveUpdates` in the sheet.** The listener lives once in the provider, not in the sheet, so the SSE stream is immune to
  the sheet's mount/unmount cycle.
- **No `chatId` in the sheet's URL.** The sheet is an overlay; the URL is for routes. The full-screen button is the bridge: it puts `chatId`
  into a real search param and navigates.
- **No back-button trap.** Opening the sheet does not push history. Closing it (X, Escape, click outside) just dismisses the overlay and the
  user is exactly where they were.
