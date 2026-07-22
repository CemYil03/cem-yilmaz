# Chat surfaces

Index only — where to look for chat docs. This is **not** a third product doc. Chat is two features that share foundation and presentation
rules; the grab-bag that used to live here has been split into those homes.

| Concern                                                                    | Doc                                                                                                                                                                                                      |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Desired experience (scroll, composer states, copy/TTS row, paddings)       | [`docs/styles/chat.md`](../styles/chat.md)                                                                                                                                                               |
| Message model, streaming, live updates, HITL tool approvals                | [`docs/architecture/chat.md`](../architecture/chat.md)                                                                                                                                                   |
| DB shape, history replay, attachments persistence + client upload pipeline | [`docs/architecture/chat-persistence.md`](../architecture/chat-persistence.md)                                                                                                                           |
| Public "Ask me anything" product                                           | [`docs/features/chat-visitor.md`](./chat-visitor.md)                                                                                                                                                     |
| Workspace personal-assistant product                                       | [`docs/features/chat-workspace.md`](./chat-workspace.md)                                                                                                                                                 |
| Read-aloud / TTS cache                                                     | [`docs/architecture/file-storage.md#read-aloud-tts-cache`](../architecture/file-storage.md#read-aloud-tts-cache)                                                                                         |
| Attachments (persist + upload → render → replay)                           | [`docs/architecture/chat-persistence.md#attachments`](../architecture/chat-persistence.md#attachments)                                                                                                   |
| Tool-call approvals (HITL)                                                 | [`docs/architecture/chat.md#human-in-the-loop-approval-is-a-requestresponse-pair-executed-by-the-sdk`](../architecture/chat.md#human-in-the-loop-approval-is-a-requestresponse-pair-executed-by-the-sdk) |

Do **not** duplicate visitor opening flows or streaming scroll rules here — those live in [`chat-visitor.md`](./chat-visitor.md) and
[`styles/chat.md`](../styles/chat.md) respectively.

## Composer stack

Three layers, base → audience wrappers:

- **`<MessageComposer />`** — `src/web/components/MessageComposer.tsx` — presentational shell (textarea, Send, attachment tiles, DnD,
  micro-states).
- **`<ChatComposer />`** — `src/web/chat/ChatComposer.tsx` — shared `chatMessageCreate` base (draft, upload lifecycle, submit gating, turn
  handshake).
- **`<VisitorChatComposer />`** / **`<WorkspaceChatComposer />`** — `src/web/chat/VisitorChatComposer.tsx` /
  `src/web/chat/WorkspaceChatComposer.tsx` — audience wrappers (visitor quota line vs admin model dropdown + approval-mode selector).
