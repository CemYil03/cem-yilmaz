# Workspace chat

The workspace personal-assistant chat is the private counterpart to the public visitor chat. It lives in a right-side **Sheet** mounted once
at the workspace layout (`src/routes/{-$locale}/workspace.tsx`), so every workspace page inherits it. A floating launcher in the
bottom-right corner of every workspace page opens the sheet; the workspace hub's hero composer also opens it (with the typed message fired
as the first turn).

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

| Entry point                                                                    | How it opens the sheet                              | Notes                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------ | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace hub composer                                                         | `useWorkspaceAssistantChat().openWithMessage(text)` | Hub composer fires the typed message as the first turn; the conversation continues in the sheet.                                                                                                      |
| Floating launcher (every workspace page except hub and `/workspace/assistant`) | `useWorkspaceAssistantChat().open()`                | FAB-style circle, bottom-right of the viewport. Hidden on the hub (the hero composer is the launcher there) and on `/workspace/assistant` (the route IS the chat). Pulses while a turn is generating. |
| Sheet's **"Open full-screen"** button                                          | Navigates to `/workspace/assistant?chatId=<id>`     | Hands the conversation off to the dedicated full-screen route — the chat row is the same on both sides.                                                                                               |

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
`sendMessage(text)`. The provider owns the `chatId`, the live-updates hook, the mutation, and the chat-id ref that makes back-to-back sends
append to the same `chats` row (the same pattern `VisitorChatProvider` uses).

The composer has one addon-start control: a "Start new chat" icon button that appears once a chat is active. Clicking it calls
`resetChat()`, which drops `chatId` and `loadedMessages` so the next send creates a fresh row. The previous chat is still in the database —
admins can resume it from the dedicated route once a previous-chats list lands there.

## Full-screen route handoff

Clicking "Open full-screen" in the sheet:

1. Closes the sheet via `setOpen(false)`.
2. Navigates to `/workspace/assistant?chatId=<id>` (or `?chatId=undefined` if no chat has started yet).
3. The route reads `chatId` from the URL search and takes over — empty state when none, loaded transcript when set.

The provider does NOT drop its `chatId` on the navigation — if the user navigates back to a workspace page (the hub, a focus area), the
sheet's launcher is one click away and reopening shows the same conversation. The route page is the source of truth for "is this chat
bookmark-able", and the provider is the source of truth for "is there a chat happening right now."

## Files

```
src/web/chat/
├── WorkspaceAssistantChatProvider.tsx    Provider — owns chatId, live updates, sendMessage, resetChat, loadChat.
├── WorkspaceAssistantChatSheet.tsx       Sheet — transcript + composer + header chrome (open-full-screen, expand, close).
└── WorkspaceAssistantLauncher.tsx        Floating launcher (FAB) shown on every workspace page except the hub and /workspace/assistant.

src/routes/{-$locale}/
└── workspace.tsx                         Workspace layout — wraps `<Outlet />` in the provider and mounts the sheet + launcher.
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
