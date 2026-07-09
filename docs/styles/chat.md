# Chat

Every chat surface on this site — the visitor "Ask me anything" sheet on the landing page, the workspace assistant in the sidebar and its
deep-link route, the workspace compass psychological interview — is held to the same bar. The rules below exist so the _next_ chat surface
inherits the good behaviours automatically, without anyone having to remember them.

This doc is about **presentation** — how a chat looks, how it scrolls, how the composer feels, how the copy/TTS row sits under an assistant
reply. It is not about the message union, streaming machinery, tool-call approval flow, or LLM replay — those live in
[`docs/architecture/chat.md`](../architecture/chat.md), [`docs/architecture/chat-persistence.md`](../architecture/chat-persistence.md), and
[`docs/architecture/chat-transcript.md`](../architecture/chat-transcript.md). See [`docs/features/chat.md`](../features/chat.md) for the
visitor-facing behaviours (composer flow, read-aloud, attachments).

## The one principle

**Every chat surface reads as the same product.** Chat is where trust is either earned or lost — a jittery scroll, a lost draft, a
hover-only copy button on mobile, an assistant reply that appears without streaming — any one of those breaks the illusion that a real,
considered person is on the other end. The rules below are the smallest set that hold that illusion together.

Before adding _anything_ chat-shaped — a new surface, a new message variant, an extra button in the composer — check: does it obey these
rules already, or does it break one? If it breaks one, the answer is almost always to reach past the surface into the shared primitive and
add the rule there, not to bend the rule for the new surface.

## Opening a chat — anchor, don't dump

| Rule                                                                               | Where it lives                                                |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Open at the **last meaningful anchor**, not the absolute bottom                    | `MessageScrollerProvider defaultScrollPosition="last-anchor"` |
| No JS `scrollIntoView` on mount — the primitive lands the reader before paint      | `MessageScroller`                                             |
| The empty state renders **inside** the transcript viewport, not above the composer | Surface layout (`grid grid-rows-[1fr_auto]`)                  |

**Why the last anchor, not the bottom.** Bookmarking `/workspace/assistant/<chatId>` and returning to it should drop the reader at the last
user message with its reply visible — not past everything with no context for what the assistant just said. This is the industry norm
(ChatGPT, Claude.ai, Gemini). The `MessageScroller` primitive gets this right for free; the only rule is: **always** pass
`defaultScrollPosition="last-anchor"`.

**Why not `scrollIntoView`.** A JS scroll on mount produces a visible flash — first paint at the top of the transcript, then a jump to the
tail. The primitive lands the reader before paint using its own layout effect.

**Why the empty state stays in the viewport.** If the empty state renders _above_ the composer, the composer moves — from mid-page to
bottom-of-page — as soon as the first message lands. Keeping it in the viewport row of the outer `grid grid-rows-[1fr_auto]` means the
composer is sticky-bottom in every state and muscle memory works.

## Streaming — one channel, one slot, no polling

| Rule                                                                 | Where it lives                                                             |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Every AI reply **streams**. Non-streaming is a bug                   | Server (`chatUpdates` subscription), client (`useChatLiveUpdates`)         |
| The streaming row's `chatMessageId` is **pre-allocated** server-side | `chatAssistantTurnRun.ts`                                                  |
| The persisted row keys on the same id — swap is a React no-op        | `ChatTranscript` (streaming section keyed on the pre-allocated id)         |
| Send **never refetches**                                             | Initial query + `chatUpdates` subscription; no `mutate → refetch` anywhere |
| Streaming placeholder is a **shimmer**, not a spinner                | `shimmer` utility in `AssistantMarkdown` while the buffer is empty         |

**Why streaming is non-negotiable.** Perceived latency drops from "seconds waiting" to "instant" the moment the first token paints. Every
consumer LLM surface streams; a non-streaming assistant reads as broken.

**Why pre-allocated ids.** The server allocates the eventual `ChatMessageAssistantText.chatMessageId` before the stream starts and publishes
it on every `ChatUpdateAssistantTextChunk`. The client renders the streaming preview keyed on that id, and when the persisted
`ChatUpdateMessageAppended` lands with the same id, React swaps rows in place — no flash, no layout shift, no key change. The wire shape is
documented in [Chat foundation — Live updates](../architecture/chat.md#live-updates-flow-through-one-chat-scoped-subscription).

**Why no refetch on send.** The transcript reads from initial query + subscription buffer only. A `refetch()` on send would race the
subscription, drop the pre-allocated-id swap, and flash. If a surface finds itself reaching for `refetch()`, the transcript wiring is wrong.

**Why shimmer, not spinner.** A spinner reads as "still fetching over the network." A shimmer on the row we're about to fill reads as
"content about to arrive here." The shadcn `shimmer` utility is in `shadcn/tailwind.css`; `AssistantMarkdown` uses it while its streaming
buffer is empty.

## Scroll behaviour during streaming — follow while at the edge, never yank

| Concern                                    | Value                                                              | Rationale                                                                                                                                                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stick-to-bottom edge threshold             | **64 px**                                                          | Streamdown produces sub-pixel content-height jitter as it grows; 64 px absorbs it without dropping stick mode. Any smaller and stick-mode chatters; larger and casual scroll-ups look like the reader is still at the bottom. |
| Anchor new turns near                      | **top of viewport**                                                | The `MessageScroller` primitive handles this — a fresh reply grows _into_ the screen instead of pushing everything up. Reader can watch it fill.                                                                              |
| Jump-to-latest pill visibility             | **only while `data-active="false"` on the scroller**               | The pill's fade in/out is driven by the primitive's `data-active` state — 400 ms out-quint on hide, 200 ms in-quint on show. Do not hand-roll a second one.                                                                   |
| Auto-follow interrupts on                  | **any user scroll up, keyboard nav, text selection, or link open** | If the reader is doing anything at all, follow stops. Resumes when they smooth-scroll back via the pill or the natural bottom edge.                                                                                           |
| Position preservation on prepended history | **free** — the primitive handles it                                | Once "load older messages" ships, the transcript won't jump under the reader.                                                                                                                                                 |

**Do not** hand-roll `scrollIntoView` or a home-grown `isAtBottom` toggle. Every surface routes through the `MessageScroller` primitive; the
config lives in `ChatTranscriptShell` (see [The shared primitives](#the-shared-primitives)) so all surfaces inherit the same values.

## Scrollbar gutter — reserved, never over the bubbles

| Rule                                                               | Where it lives                                                                                      |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| The viewport reserves `scrollbar-gutter: stable`                   | `ChatTranscriptShell` (`src/web/components/base/chat-transcript-shell.tsx`)                         |
| The viewport ships `pr-2` breathing room to the right of bubbles   | `ChatTranscriptShell`                                                                               |
| A surface **must not** turn the gutter off via `viewportClassName` | Review-time reject — the class merges on top of the shell's, so pass no override unless widening it |

**Why the gutter is reserved.** Without `scrollbar-gutter: stable` the scrollbar draws _over_ the rightmost user bubbles on WebKit and
legacy Firefox — the visitor sees a scrollbar track cut across a blue bubble as content grows past the viewport. Reserving the lane costs a
few pixels of horizontal room but every browser paints the same layout in every state, empty to full.

**Why `pr-2` on top.** Even with the gutter reserved, a right-aligned bubble still visually kisses the scrollbar track on WebKit — 8 px of
padding to the right of the content lane keeps a hairline gap between bubble and track.

**Why in the shell, not per-surface.** Bubbles under the scrollbar was the exact symptom that motivated centralizing this — every surface
used to opt in with its own `viewportClassName="pr-3 [scrollbar-gutter:stable]"` and the deep-link route silently drifted by omitting it.
The rule now lives in `ChatTranscriptShell` so a new surface inherits it automatically.

## Message rendering

| Rule                                                                                                 | Where it lives                                                                                       |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| User messages are **right-aligned bubbles**                                                          | `Bubble tone="user"` (`chat-message/shared.tsx`)                                                     |
| Assistant text is **unbubbled markdown flush in the row**                                            | `AssistantMarkdown` inside `<MessageRow side="assistant">`                                           |
| **No avatars** on any variant                                                                        | —                                                                                                    |
| Every assistant text row ships **timestamp, TTS, copy** — in that order, on one row beneath the body | `Timestamp` + `SpeakButton` + `CopyButton` (`chat-message/shared.tsx`)                               |
| Copy button copies **raw markdown**, not rendered text; flashes check for **1.5 s**                  | `CopyButton`                                                                                         |
| TTS walks **idle → loading → playing → paused**, with a separate **stop** button                     | `SpeakButton`                                                                                        |
| TTS pre-warms on `mouseenter`/`focus`                                                                | `SpeakButton.onMouseEnter`                                                                           |
| Bubble max-width                                                                                     | `max-w-[80%]` of the row (both tones)                                                                | `Bubble` |
| Bubble radius                                                                                        | `rounded-2xl`, with `rounded-br-sm` on user and `rounded-bl-sm` on assistant to point at the speaker | `Bubble` |

**Why unbubbled assistant markdown.** Long-form markdown — tables, fenced code, block quotes — needs unclipped width. A bubble around
markdown clips or scrolls it, and either reads as amateur. Gemini, Claude.ai, and ChatGPT all render assistant markdown unbubbled; the site
matches.

**Why timestamp + TTS + copy always visible.** Hover-only actions on assistant messages are hostile on mobile — the user has no hover. Ship
the three-button row on every assistant text row, on every viewport. It's the visitor's exit from the transcript: "when was this?", "read it
to me", "I want this text elsewhere."

**Why raw markdown for copy.** Power users paste back into notes / other tools that render markdown themselves; copying the rendered text
strips formatting they'd want.

The TTS state machine, pre-warm, and caching are documented in [`docs/features/chat.md#read-aloud`](../features/chat.md#read-aloud). The
rule here is: **use `SpeakButton`**. Don't roll a new one.

## Composer — hard rules

Every chat composer wraps `MessageComposer` (`src/web/components/MessageComposer.tsx`). Anything that hand-rolls a textarea + send button is
a review-time reject. The primitive already ships every rule below.

| Concern                | Value                                                                                                                       | Rationale                                                                                                                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Submit key             | **Desktop:** Enter sends; Shift+Enter inserts a newline. **Mobile:** Enter inserts a newline; only the Send button submits. | Desktop keeps the universal chat shortcut. Soft-keyboard Return must insert newlines — intercepting it made multi-line drafts impossible.                                                             |
| Auto-grow              | **`field-sizing: content` + `max-h-[40vh]`**                                                                                | Grows with content, capped so a runaway paste can't push the page.                                                                                                                                    |
| Focus ring             | **brand-tinted** — `focus-within:border-brand`, `ring-brand/30`                                                             | Ties the composer into the ambient orb / links / chart-1. See [motion.md — Composer states](./motion.md#composer-states).                                                                             |
| Ready micro-state      | Send **lifts `-translate-y-px`** and fades muted → full opacity, 200 ms                                                     | Answers "I noticed you typed something." Suppressed under `motion-reduce`.                                                                                                                            |
| Sending                | **`SendIcon` crossfades to `Spinner`**, 150 ms                                                                              | Answers "did it hear me?"                                                                                                                                                                             |
| Sent                   | **`CheckIcon` flashes for 700 ms** on the `busy → !busy` edge, then reverts to `SendIcon`                                   | Answers "did it land?"                                                                                                                                                                                |
| Post-turn focus        | Textarea **refocuses automatically** on `busy → !busy`                                                                      | Textarea was `disabled` mid-turn (focus fell to `<body>`); this is a real refocus, not a no-op.                                                                                                       |
| Draft restore on error | Restore the trimmed message and call `endTurn()`                                                                            | The user's message may have been the most thought-through of the session — never lose it.                                                                                                             |
| Locked while streaming | Textarea + Send disabled while `busy === true`                                                                              | Prevents two overlapping turns. `addonStart` children stay reactive (model picker, approval-mode selector) so those still read as live.                                                               |
| Attachments (opt-in)   | Paperclip in the bottom addon, drop zone on the whole `<form>`, per-tile lifecycle                                          | Passed as `attachments` + `onAttachmentsAdd` + `onAttachmentRemove`. Bytes never touch the composer — parent owns the upload lifecycle. See [`chat.md#attachments`](../features/chat.md#attachments). |
| Textarea `name`        | Defaults to `'message'`                                                                                                     | Chrome logs "A form field element should have an id or name attribute" without one. Override per surface if needed.                                                                                   |
| `autoFocus`            | Opt-in via prop                                                                                                             | Only pass on surfaces where the composer is the primary affordance (workspace hub landing, deep-link route). Otherwise the page decides what gets focus first.                                        |

**How a surface wraps the primitive.** Every audience wrapper (`VisitorChatComposer`, `WorkspaceChatComposer`, `CompassInterviewComposer`)
accepts `beginTurn`, `endTurn`, and `isLocked` from a live-updates hook, holds its own `draft` state, and passes `busy` + `disabled` into
`MessageComposer`. No side-channels; no imperative refs; no wrapper that reaches into the composer's DOM.

## Layout — paddings, max-widths, breakpoints

The numbers below are canonical. They live as CSS variables in `src/styles.css` so surfaces read the same value in one place; changes go
there, not scattered across N surface files.

| Concern                       | Mobile                                                                                                                                      | ≥ sm (640 px)                                                                                                  | Rationale                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Transcript vertical padding   | `pt-4 pb-6`                                                                                                                                 | `pt-4 pb-6`                                                                                                    | The composer parks below with its own `p-4`; total gap to the bottom edge reads as ~24 px.                |
| Transcript horizontal padding | `px-4` (`--chat-viewport-px-mobile: 1rem`)                                                                                                  | `px-6` (`--chat-viewport-px-desktop: 1.5rem`)                                                                  | 16 px thumb-clearance on mobile; 24 px on desktop where the surface is proportionally narrower.           |
| Message column max-width      | **`max-w-3xl`** (48 rem, `--chat-column-max: 48rem`) when expanded, else the surface's own sheet cap (`sm:max-w-2xl` for the visitor sheet) | Reads as one line of continuous prose (~72–96 chars). Wider than this, long assistant markdown becomes a wall. |
| Row gap inside a date group   | `gap-4` (`--chat-row-gap: 1rem`)                                                                                                            | same                                                                                                           | 16 px between turns — dense enough to read as a conversation, loose enough to scan.                       |
| Gap between date groups       | `gap-8` (`--chat-group-gap: 2rem`)                                                                                                          | same                                                                                                           | 32 px — the group is a section, not a row.                                                                |
| Composer container padding    | `p-4` with `pb-[max(1rem,env(safe-area-inset-bottom))]`                                                                                     | same                                                                                                           | iOS home-indicator clearance — otherwise the composer sits under the gesture bar.                         |
| Sticky composer               | Composer is the bottom row of a `grid grid-rows-[1fr_auto]` on every surface                                                                | same                                                                                                           | Grid puts the composer in the safe zone regardless of transcript height. No `position: sticky` foot-guns. |
| Bubble max-width (both tones) | `max-w-[80%]` of the row                                                                                                                    | same                                                                                                           | Matches Gemini / ChatGPT proportions; keeps the right-side "someone else spoke" affordance visible.       |

When a new surface genuinely needs a different value — a full-width workspace panel, say — override at the _surface_ level with the token
override, don't reach past the primitive.

## Accessibility

| Rule                                                                             | Where                                                      |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Streaming assistant text renders inside `aria-live="polite" aria-atomic="false"` | Transcript viewport (streaming section)                    |
| Composer textarea has an explicit `name`                                         | `MessageComposer` (defaults to `'message'`)                |
| Send button has an `aria-label` matching the localised "Send" tooltip            | `MessageComposer`                                          |
| Jump-to-latest pill has an SR-only label                                         | `MessageScrollerButton`                                    |
| `prefers-reduced-motion` suppresses the Send-button lift                         | `motion-reduce:enabled:translate-y-0` in `MessageComposer` |
| Focus lands on the composer when a surface opens as the primary affordance       | `autoFocus` prop on `MessageComposer`                      |
| Escape closes sheet / dialog surfaces                                            | Radix defaults — do not override                           |

**Why `polite` not `assertive`.** `assertive` interrupts whatever the screen reader is currently reading, which is hostile on mobile where
the reader may be part-way through the previous message. `polite` queues the announcement so the reader hears it at the next natural break.

**Why an explicit textarea `name`.** Chrome and accessibility tooling both flag anonymous form fields. The default `'message'` is fine for
most surfaces; override only if a page has two composers on it.

## Bilingual copy

Every user-facing string in a chat surface uses the inline `{ de: '…', en: '…' }[locale]` literal at the call site (see
[`docs/conventions.md`](../conventions.md#bilingual-copy)). The strings the shared primitives own:

| String                                                            | Where                                                               |
| ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| Composer placeholder                                              | Passed by the wrapper (e.g. `CompassInterviewComposer.placeholder`) |
| "Send" tooltip + button `aria-label`                              | Inside `MessageComposer` (derived from `useLocale()`)               |
| "Jump to latest" pill label                                       | Passed by the transcript caller (`jumpToLatestLabel` prop)          |
| "Thinking…" streaming placeholder                                 | Inside `AssistantMarkdown`                                          |
| TTS states (Read aloud / Pause / Resume / Stop / Cancel / Failed) | Inside `SpeakButton`                                                |
| Copy states (Copy message / Copied / clipboard failure toast)     | Inside `CopyButton`                                                 |

If a new string lands, it goes in the primitive that owns the visual — not in the surface that happens to render it — so both languages stay
coherent across every chat surface.

## The shared primitives

Before writing a new chat-shaped anything, check whether one of these already covers it.

| Primitive                                                                               | File                                                | Use when                                                                                                                                                                                               |
| --------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `MessageComposer`                                                                       | `src/web/components/MessageComposer.tsx`            | You need a chat-style textarea. Never hand-roll one.                                                                                                                                                   |
| `ChatComposer`                                                                          | `src/web/chat/ChatComposer.tsx`                     | The surface fires `chatMessageCreate` (visitor + workspace). Owns draft state, upload lifecycle, `beginTurn` / `endTurn` handshake, and draft restore.                                                 |
| `VisitorChatComposer` / `WorkspaceChatComposer`                                         | `src/web/chat/*Composer.tsx`                        | Audience wrappers over `ChatComposer` — mutation + model picker + rate-limit hooks pre-wired.                                                                                                          |
| `CompassInterviewComposer`                                                              | `src/web/chat/CompassInterviewComposer.tsx`         | Structural clone for the compass interview (its message union isn't `ChatMessage`). Same `MessageComposer` underneath.                                                                                 |
| `ChatTranscriptShell`                                                                   | `src/web/components/base/chat-transcript-shell.tsx` | You need a chat scroll container. Pins `defaultScrollPosition="last-anchor"`, `scrollEdgeThreshold={64}`, the jump-to-latest pill, and the streaming ARIA live region. **Every transcript uses this.** |
| `ChatTranscript` (shared)                                                               | `src/web/chat/ChatTranscriptShared.tsx`             | The surface renders the `ChatMessage` union. Handles date grouping, tool-call nesting, collection folding, approval gating.                                                                            |
| `CompassInterviewTranscript`                                                            | `src/web/chat/CompassInterviewTranscript.tsx`       | Interview transcript — different message shape, same shell + row atoms.                                                                                                                                |
| `MessageScroller*`                                                                      | `src/web/components/base/message-scroller.tsx`      | The shadcn primitive under `ChatTranscriptShell`. Reach for the shell first — only touch this directly when the shell doesn't cover you.                                                               |
| `AssistantMarkdown`                                                                     | `src/web/components/AssistantMarkdown.tsx`          | Rendering AI-produced markdown (streaming or persisted). Handles partial fences/tables via `parseIncompleteMarkdown`.                                                                                  |
| `MessageRow`, `Bubble`, `Timestamp`, `CopyButton`, `SpeakButton`, `ToolArgumentsButton` | `src/web/components/chat-message/shared.tsx`        | Row-level atoms shared by every message variant. Reaching past these into raw JSX is a review-time reject.                                                                                             |
| `useChatLiveUpdates`                                                                    | `src/web/chat/useChatLiveUpdates.tsx`               | `ChatMessage`-union surfaces subscribe to `chatUpdates` here. Owns `beginTurn` / `endTurn`.                                                                                                            |
| `useCompassInterviewLiveUpdates`                                                        | `src/web/chat/useCompassInterviewLiveUpdates.tsx`   | Interview subscription — parallel to `useChatLiveUpdates` because its wire type is different.                                                                                                          |

Compose these before reaching for a dependency. No chat library has been added to the project, and none is needed — shadcn's
`MessageScroller` covers the hard scroll cases, and the composer / row primitives are project-local.

## Anti-patterns

The list below names things that are tempting but wrong here. They are not allowed without an explicit conversation.

- **Hand-rolled `scrollIntoView` on new messages.** Breaks the follow-only-at-edge rule. Route through `ChatTranscriptShell` / the
  `MessageScroller` primitive.
- **A home-grown `isAtBottom` toggle.** The primitive's `data-active` state is already the source of truth; a parallel one drifts.
- **Typing indicator dots without a shimmer'd row.** Reads as a toy chatbot. The shimmer'd row is the industry-standard "content coming"
  affordance because it visually maps to the row about to be filled.
- **Hover-only copy / TTS actions.** Mobile users get nothing. Keep them visible on every assistant row.
- **A "Regenerate" button that clones the last turn.** Out of scope for this site. If it ever lands, it lands as a real feature with docs,
  not as a decoration.
- **Full-page scroll (transcript scrolls with the page).** Locks the composer out of the bottom-safe zone and breaks streaming follow. Every
  surface's transcript is its own scroll container inside a `grid grid-rows-[1fr_auto]`.
- **`aria-live="assertive"` on the streaming region.** Hostile on mobile screen readers.
- **Bubbled assistant markdown.** Clips tables and code. Assistant text is flush.
- **Avatars.** Not this site.
- **A refetch on send.** The subscription is the live signal; a refetch races it and flashes.
- **Composer that doesn't wrap `MessageComposer`.** Raw `<textarea>` inside a chat surface is always a review-time reject.
- **Per-surface `viewportClassName` that redeclares `scrollbar-gutter:stable`.** The shell already reserves the lane. Redeclaring it in
  every surface is how the deep-link route silently dropped the rule and painted the scrollbar over a bubble in the first place.

## How to add a new chat surface

1. Decide whether the message shape is the `ChatMessage` union or something new. If it's the union, you get `ChatComposer` +
   `ChatTranscript` for free. If it's new (compass-style), plan on a structural clone that still wraps `MessageComposer` and
   `ChatTranscriptShell`.
2. Add the GraphQL query / subscription for the surface (see [`docs/architecture/chat.md`](../architecture/chat.md) for the pattern —
   initial query + `chatUpdates` subscription).
3. Write the audience wrapper composer. Import `MessageComposer` and pass it a `beginTurn`, `endTurn`, `isLocked` triple from your
   live-updates hook. **Do not** import a `<textarea>`.
4. Compose the transcript. Wrap `ChatTranscriptShell`. If the union is `ChatMessage`, use `ChatTranscript`; otherwise render your own rows
   using `MessageRow` + `Bubble` + `AssistantMarkdown` + `Timestamp` + `CopyButton` + `SpeakButton` — none of which you should be
   re-implementing.
5. Lay the surface out as `grid grid-rows-[1fr_auto]` — transcript on top, composer at the bottom, with
   `pb-[max(1rem,env(safe-area-inset-bottom))]` on the composer container.
6. Add the surface to the per-surface audit table below.
7. Add a feature doc under `docs/features/{surface}.md` covering the surface-specific behaviours (empty state, deep links, entry points).

## Per-surface audit

The audit is a live checklist: adding a new surface adds a row.

| Surface                                                                                         | Anchor open | Streaming | Stick-to-bottom (64 px) | Jump-to-latest pill | Enter / Shift+Enter (desktop; mobile: Send only) | Auto-refocus post-turn | Copy on assistant   | TTS on assistant    | Timestamp | Column max-width                     | `aria-live` on streaming  | Notes                                                                          |
| ----------------------------------------------------------------------------------------------- | ----------- | --------- | ----------------------- | ------------------- | ------------------------------------------------ | ---------------------- | ------------------- | ------------------- | --------- | ------------------------------------ | ------------------------- | ------------------------------------------------------------------------------ |
| Visitor sheet (`WebsiteVisitorAssistantChatSheet.tsx`)                                          | ✅          | ✅        | ✅                      | ✅                  | ✅                                               | ✅                     | ✅                  | ✅                  | ✅        | `sm:max-w-2xl`, `max-w-3xl` expanded | via `ChatTranscriptShell` | —                                                                              |
| Workspace assistant sidebar + `/workspace/assistant/$chatId` (`WorkspaceAssistantChatBody.tsx`) | ✅          | ✅        | ✅                      | ✅                  | ✅                                               | ✅                     | ✅                  | ✅                  | ✅        | inherit sidebar / route              | via `ChatTranscriptShell` | Model picker + approval-mode selector plug into `addonStart`                   |
| Compass interview (`CompassInterviewTranscript.tsx`)                                            | ✅          | ✅        | ✅                      | ✅ (localised)      | ✅                                               | ✅                     | ✅ (assistant only) | ✅ (assistant only) | ✅        | inherit                              | via `ChatTranscriptShell` | User rows show an "N observations extracted" chip — compass-specific and stays |

## File locations

| Concern                                             | File                                                                                                |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| This doc                                            | `docs/styles/chat.md`                                                                               |
| Composer primitive                                  | `src/web/components/MessageComposer.tsx`                                                            |
| Composer base (`ChatMessage` surfaces)              | `src/web/chat/ChatComposer.tsx`                                                                     |
| Audience wrappers                                   | `src/web/chat/VisitorChatComposer.tsx`, `WorkspaceChatComposer.tsx`, `CompassInterviewComposer.tsx` |
| Transcript shell (pins scroll config + live region) | `src/web/components/base/chat-transcript-shell.tsx`                                                 |
| `ChatMessage`-union transcript                      | `src/web/chat/ChatTranscriptShared.tsx`                                                             |
| Compass interview transcript                        | `src/web/chat/CompassInterviewTranscript.tsx`                                                       |
| Shared row atoms                                    | `src/web/components/chat-message/shared.tsx`                                                        |
| Streaming markdown renderer                         | `src/web/components/AssistantMarkdown.tsx`                                                          |
| Chat CSS tokens                                     | `src/styles.css` (`--chat-*`)                                                                       |
| Live-updates hook (`ChatMessage`)                   | `src/web/chat/useChatLiveUpdates.tsx`                                                               |
| Live-updates hook (compass)                         | `src/web/chat/useCompassInterviewLiveUpdates.tsx`                                                   |
| Motion rules for the composer states                | `docs/styles/motion.md` (Composer states)                                                           |
| Foundation, schema, replay                          | `docs/architecture/chat.md`, `chat-persistence.md`, `chat-transcript.md`                            |
| Visitor-facing behaviours                           | `docs/features/chat.md`                                                                             |
