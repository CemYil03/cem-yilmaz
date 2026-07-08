# Minimal AI Chat

> **Presentation rules that apply to every chat surface on the site** — composer states, streaming shimmer, stick-to-bottom threshold,
> copy/TTS row placement, paddings, max-widths — live in [`docs/styles/chat.md`](../styles/chat.md). This doc is the visitor chat's
> specifics: entry points, opening flow, attachments, read-aloud, tool-call approvals.

> **Project note:** on cem-yilmaz.de this is the **public visitor chat** — "Ask me anything about Cem." It is **not** a standalone route; it
> lives inside a right-side `Sheet` mounted at the root layout and opened from the landing page's Assistant section, the suggestion chips,
> or the chat icon in the site header. The workspace personal assistant gets its own feature doc — see [Workspace Hub](./workspace-hub.md)
> and [Workspace Chat](./chat-workspace.md). The visitor-only concerns (anonymous authoring, rate limiting, previous-chats list, admin
> review at `/workspace/visitor-chats`) live in [Visitor Chat](./chat-visitor.md).

## User Behavior

A visitor on the landing page (`/` or `/en`) types a question into the Assistant section's composer — the same `<VisitorChatComposer />`
that lives inside the sheet. The composer fires `chatMessageCreate` from the landing page so the user sees the busy / sent micro-states on
the input they actually typed in; the freshly-allocated chatId is handed to `VisitorChatProvider`, the sheet pops open, and the streaming
response surfaces there. Suggestion chips (and the `?ask=…` deep link) take a slightly different path through the provider's
`openWithMessage(text)` — the chip text isn't typed, so there's no input surface to host the micro-states; the provider fires the mutation
and opens the sheet directly.

The same sheet can also be opened from the **chat icon in the site header** (any public page) — that entry point opens the sheet in its
empty state with no seeded send, listing the visitor's previous chats so they can pick one up where they left off. See
[Visitor Chat](./chat-visitor.md) for the provider state and the entry-point table.

The transcript renders the full message history grouped by date, using the shared `<ChatMessage />` component for every variant of the
message union. Subsequent sends are appended to the same chat. There is no URL state — the chatId lives in `VisitorChatProvider` and
survives the sheet closing; reopening shows the same conversation until the user clicks "New chat" or sends from the landing-page hero again
(which starts a fresh chat).

The composer:

- Auto-grows up to a few lines (`<InputGroupTextarea />` with `field-sizing-content`) inside an `<InputGroup>` whose `block-end` addon hosts
  the Send button. The composer stack is three layers, base → audience wrappers:
  - **`<MessageComposer />`** (`src/web/components/MessageComposer.tsx`) — pure presentational shell. Textarea, Send button (icon-only, with
    a localized "Send" tooltip), attachments preview row, drag-and-drop zone, the `block-end` addon slot, and the focus / ready / sending /
    sent micro-states. Audience-agnostic; the parent owns submit semantics.
  - **`<ChatComposer />`** (`src/web/chat/ChatComposer.tsx`) — shared base for any audience that fires `chatMessageCreate`. Owns draft
    state, attachment upload lifecycle, submit gating, the `beginTurn` → mutation → `endTurn`-on-failure handshake, and draft restoration on
    transport failure. Takes `sendMutation` and `extractResult` as required props — it knows nothing about visitor vs admin.
  - **`<VisitorChatComposer />`** and **`<WorkspaceChatComposer />`** — the two audience wrappers. The visitor wrapper pre-wires the visitor
    mutation and renders the always-visible rate-limit quota line in the bottom-left addon slot. The admin wrapper pre-wires the admin
    mutation, pulls model selection from `useWorkspaceAssistantChat()`, and renders the model dropdown + the tool-call approval-mode
    selector (Auto / Manual) into the bottom-left addon. Both expose their own `addonStart` slot for surface-specific extras (e.g. the
    sheet's "New chat" button, the admin sheet's `resetChat` button).
- Sends on `Enter`; `Shift+Enter` inserts a newline.
- Disables itself while a response is streaming and shows an inline spinner.
- Restores the draft if the mutation errors.
- Returns focus to the textarea as soon as the per-turn lock lifts (`busy` flips back to `false`), so the user can keep typing without
  reaching for the mouse. The textarea is `disabled` mid-turn — which moves focus to `<body>` — so this is a real refocus, not a no-op.
  Implemented inside `<MessageComposer />` so any caller (chat or otherwise) gets the behavior for free.
- Accepts file attachments via a paperclip icon-button left of Send and via drag-and-drop onto the composer. Attached files render as a
  horizontal row of preview tiles inside the input group above the typed text, each with an X button at the top-right to remove it. Image
  files preview their thumbnail (via `URL.createObjectURL`); other types fall back to a file icon and the filename. See
  [Attachments](#attachments) below for the current scope.

While the assistant is generating, every event of the turn arrives over a single chat-scoped subscription (`chatUpdates`, see below): the
user's message lands as soon as the server commits it, every tool call / approval / input collection lands as soon as it persists, and the
assistant's text streams in at the **bottom of the transcript** — exactly where the persisted message will land — through
[Streamdown](https://streamdown.ai) with `parseIncompleteMarkdown` so partial fences and tables look right mid-stream. The streaming row's
`chatMessageId` is pre-allocated by the server before streaming begins; when the persisted `ChatMessageAssistantText` row arrives via the
same subscription, the streaming entry disappears and the persisted row takes its place keyed by the same id, so React swaps the row in
place with no flash, no layout shift, and no refetch.

The transcript stays pinned to the bottom on initial render and as new content streams in. If the user scrolls up while a turn is in flight,
auto-follow stops and a floating "Jump to latest" pill appears at the bottom-center of the scroll area; clicking it smooth-scrolls back to
the tail and re-attaches the auto-follow. The "are we at the bottom?" check uses a 64 px tolerance so the few-pixel content-height jitter
Streamdown produces between scroll events doesn't drop us out of stick mode. The decision to re-pin is read from a ref that `onScroll`
updates and the `useLayoutEffect` consults — `onScroll` fires after the previous layout effect, so the ref always holds the pre-update
bottom answer the next batch needs. Implemented in `ChatTranscript` inside `src/web/chat/WebsiteVisitorAssistantChatSheet.tsx`.

Assistant text messages render free-floating — no chat bubble, no avatar — directly on the page background. A timestamp, a **Read-aloud**
button and a Copy button sit on a single row beneath the body; the Copy button writes the raw markdown body to the clipboard and flashes a
check for ~1.5 s. The Read-aloud button calls Gemini TTS via `/api/tts` — see [Read-aloud](#read-aloud) below. User messages keep the
right-aligned bubble. Input-collection cards (interactive form, answered summary, or skipped state) render free-floating without an avatar.

Tool-call pills and approval cards both render a small braces icon-button labelled "Show arguments" via tooltip. Clicking it opens a dialog
with the call's arguments JSON-pretty-printed — see "Tool argument inspection" below.

## Implementation

| Concern                      | Where                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| Sheet component              | `src/web/chat/WebsiteVisitorAssistantChatSheet.tsx`                                |
| Landing-page integration     | `src/routes/{-$locale}/index.tsx` (`AssistantSection`)                             |
| Operations                   | `src/web/chat/ChatPage.graphql`                                                    |
| Live-update hook             | `src/web/chat/useChatLiveUpdates.tsx`                                              |
| Composer base                | `src/web/chat/ChatComposer.tsx`                                                    |
| Composer — visitor wrapper   | `src/web/chat/VisitorChatComposer.tsx`                                             |
| Composer — admin wrapper     | `src/web/chat/WorkspaceChatComposer.tsx`                                           |
| Transcript helpers           | `src/web/chat/chatTranscript.ts`                                                   |
| Slot-kind registry           | `src/web/chat/chatAssistantInputKinds.ts`                                          |
| Per-message rendering        | `src/web/components/chat-message/` (existing, see [Chat](../architecture/chat.md)) |
| Markdown renderer            | `src/web/components/AssistantMarkdown.tsx` (streaming + persisted)                 |
| Server reads                 | `src/server/queries/chatFindOne.ts` (existing)                                     |
| Joined-row JOIN + shape      | `src/server/queries/chatMessageRowsBaseQuery.ts`                                   |
| Server writes + streaming    | `src/server/commands/chatMessageCreate.ts` (existing)                              |
| Per-message commit + publish | `src/server/commands/chatMessageAppend.ts`                                         |
| Joined-row read for publish  | `src/server/queries/chatMessageRowLoad.ts`                                         |
| Collection submit            | `src/server/commands/chatInputCollectionRespond.ts`                                |
| Tool approval respond        | `src/server/commands/chatToolApprovalRespond.ts`                                   |
| Approval-gated tool          | _none in Phase 1 — Phase 2 personal-assistant agent introduces real gated tools_   |
| Shared assistant turn        | `src/server/commands/chatAssistantTurnRun.ts` (`chatAssistantTurnRunDetached`)     |

The sheet hosts these operations:

1. **`ChatPage` query** — pulls the current session, the chat, and every message via the shared `ChatMessageFields` fragment.
   `chat.messages` is a flat insertion-ordered list; the client groups by date at render time so subscription-delivered messages land in the
   right group without a refetch. Loaded once when the chatId becomes available on the provider; the subscription extends the transcript
   from there. There is no refetch on send.
2. **`ChatMessageCreate` mutation** — inlines the `ChatAssistantOptions` literal so that `typescript-operations` does not re-emit
   `GqlCChatAssistantOptions` and clash with the `typescript` plugin's emission.
3. **`ChatUpdates` subscription** — single live channel for the in-flight turn. Keyed by a per-turn `generationId` (UUIDv4 generated
   client-side, owned by `useChatLiveUpdates`). Carries every persisted message append on `ChatUpdateMessageAppended` (user message, tool
   calls, approvals, input collections, the final assistant text) and every assistant-text delta on `ChatUpdateAssistantTextChunk`. The
   chunk variant carries the pre-allocated `chatMessageId` of the eventual persisted row so the in-place streaming preview swaps to the
   persisted row by id with no flash. `ChatUpdateTurnEnded` fires once per turn so the hook can tear down per-turn state. See
   [Chat foundation — Live updates](../architecture/chat.md#live-updates--chat-scoped-subscription-as-the-source-of-truth).
4. **`ChatInputCollectionRespond` mutation** — defined as an inline `gql` template in `src/web/chat/chatInputCollectionRespondDocument.ts`
   (not in `ChatPage.graphql`) because its `[ChatMessageUserInputAnswerCreate!]!` variable references a named input type, which would
   trigger the `typescript`/`typescript-operations` duplicate-emission collision. The variables are typed explicitly via `useMutation<...>`
   generics. The submit allocates a new `generationId` via `live.beginTurn()`, the listener subscribes, and the assistant's resumed turn
   streams in through the same channel as a fresh send.
5. **`ChatToolApprovalRespond` mutation** — lives in `ChatPage.graphql` (its variables are scalars only, so the codegen collision doesn't
   trigger). Approve/decline allocates a new `generationId` and the resumed turn streams through `chatUpdates`.

The transcript renders from a single client-side store: the initial query's flat messages plus the subscription's appended buffer (deduped
by `chatMessageId`), grouped client-side by ISO date so subscription-delivered messages land in the right group without a refetch. Streaming
text rows render at the tail through the same `<AssistantMarkdown />` path the persisted `ChatMessageAssistantText` view uses, so the swap
from streaming preview → persisted row is a true no-op.

### Opening flow

Three paths into the sheet, all funneled through `VisitorChatProvider`:

- **Hero composer** (`src/routes/{-$locale}/index.tsx`) — the landing page mounts a `<VisitorChatComposer />` inside the assistant section.
  Submitting fires `chatMessageCreate` from the landing page (the live-updates listener lives on the provider above both surfaces, so it's
  already subscribed when the mutation lands), then the hero hands the freshly-allocated chatId to `setChatIdFromHero(chatId)` and pops the
  sheet via `open()`. The visitor watches the busy / sent micro-states on the input they typed in and the streaming reply in the sheet.
- **Suggestion chip / `?ask=…` deep link** — `useVisitorChat().openWithMessage(text)`. The provider runs the same `beginTurn → mutation`
  sequence internally (no input surface to drive micro-states on), captures the chatId, opens the sheet.
- **Header chat button** — `useVisitorChat().openEmpty()` drops `chatId` and opens the sheet at the empty state (previous chats + fresh
  composer).

The `useChatLiveUpdates` listener is mounted **inside the provider**, above the sheet, so the SSE subscription survives any sheet open/close
cycle and is in place BEFORE any of these paths fires its mutation (same race-avoidance pattern used by the workspace provider).

### User input flow

A `ChatMessageAssistantInputCollection` renders as a **single card with three states**, controlled by whether a matching
`ChatMessageUserInput` row exists:

- **Pending** (no userInput yet, AND the collection is the last message in the chat) — the card is interactive: typed controls per slot kind
  (date popover, range calendar, time input, single-select dropdown, multi-select toggle chips, Yes/No button pair, textarea for free text),
  with a single **Submit** button (always enabled — every slot is independently optional, and a fully-empty submit is valid). The serializer
  inside the component turns each draft into a typed `ChatAssistantInputValue` when filled and drops empty/partial slots; the route flattens
  the surviving values into the `ChatMessageUserInputAnswerCreate` flat-`kind` shape and runs `chatInputCollectionRespond`. Server-side,
  that command writes one `ChatMessageUserInput` row, replays the full transcript through `toModelMessages` (which pairs the new row with
  its collection as a `promptUserForInput` tool-result), and resumes the agent loop via the shared `chatAssistantTurnRun` helper.
- **Answered** (userInput exists with `answers.length > 0`) — the same card flips to a compact `prompt → formatted answer` summary list and
  a "✓ Answered · {time}" footer. No controls, no Submit. The transition is in-place because both states share the same `<Card>` shell.
- **Skipped** (userInput exists with `answers.length === 0`) — the questions render muted with a "Skipped · {time}" footer. Reached when the
  user pivots to a free-text message instead of using the form: `chatMessageCreate` synthesizes the empty-answers row server-side.

### Form vs step-through rendering

Each collection persists a `mode` field (`Form` | `StepThrough`) the assistant picks via the `promptUserForInput` tool's `mode` input.

- **`Form`** (default) renders every slot at once on a single card — best for short, tightly related batches.
- **`StepThrough`** renders one slot at a time with **Back / Skip / Next** controls and a `Step n / N` indicator, with the final step's
  primary button labeled **Submit**. Better for longer flows or guided sequences.

The two modes share state and the wire shape: drafts live in the same `SlotDrafts` map, partial / empty slots are valid, and Submit calls
the same `chatInputCollectionRespond` mutation with the same flat-answers payload. The server is unaware of which UI assembled the answers —
`mode` exists only for rendering and for round-tripping the LLM's choice through the `toModelMessages` replay.

The `ChatMessageUserInput` row is **never rendered as its own message** — it's folded into the matching collection card via the
`collectionUserInput` prop on `<ChatMessage />`. The route indexes userInputs by collection at render time using
`findUserInputByCollectionId` from `src/web/chat/chatTranscript.ts`. The row stays on the wire and in the database because `toModelMessages`
still replays it to the LLM as the `promptUserForInput` tool-result.

The composer is locked while the resumed assistant turn is streaming so two generations don't race.

The card flips to its answered/skipped state as soon as the userInput row arrives over the `chatUpdates` subscription — there's no separate
"submitted" client state; the in-place transition is driven entirely by the same data the page query would have re-fetched. After a refresh
the answered/skipped state therefore renders identically: no draft reset, no fresh empty form, no double-submit affordance.

`chatInputCollectionRespond` rejects a second submit against an already-answered collection with a logged error and a `null` result, so
multi-tab races and any non-UI path can't write a second userInput row either.

### Pivoting away from a form

The composer is **not** locked while a collection is on screen — the user can type a free-text message and send it. When that happens,
`chatMessageCreate` first scans the prior rows for the most recent collection that has no matching `ChatMessageUserInput`, and if it finds
one synthesizes a `{ status: 'skipped', answers: [] }` row before persisting the user message. The synthetic row is timestamped one
millisecond before the user message so replay reads `collection → skipped userInput → user message`, and `toModelMessages` emits it as a
`promptUserForInput` tool-result carrying `{ status: 'skipped', answers: [] }` so the AI SDK's "every tool-call has a tool-result" invariant
holds (skipping this would throw `MissingToolResultsError` on the next step). The `promptUserForInput` tool description tells the model what
`skipped` means so it drops the question instead of re-asking. See "Skipping — pivoting away produces an empty-answers userInput" in
[Chat Foundation](../architecture/chat.md) for the full rationale.

The pivoted-away collection's card flips from its pending state to the **skipped** state as soon as the synthetic row arrives over the
`chatUpdates` subscription — same in-place transition as a real submit, just driven by the server-side synthesis instead of a click.

### Date-scalar persistence shape

`Date`-kind answers go through a lift on write and a tolerance trim on read so the `graphql-scalars` `DateResolver` round-trips cleanly
through the JSONB column. Documented in
[Chat Persistence — Date-scalar values are stored as `YYYY-MM-DD` strings](../architecture/chat-persistence.md#date-scalar-values-are-stored-as-yyyy-mm-dd-strings).

### Latest-collection-only

The interactivity check is a one-liner: peek at the tail of the merged transcript, mark the collection interactive only if it is itself the
last message. Once any later message lands — userInput (real or skipped), free-text user message, assistant follow-up — the form locks.
Implemented in `findLatestCollectionId` in `src/web/chat/chatTranscript.ts`. See "Latest-collection-only is a UI rule" in
[Chat Foundation](../architecture/chat.md) for the rationale.

### History replay

The agent sees the full prior conversation on every turn via the shared `chatMessageRowsLoad` + `toModelMessages` pipeline. Documented in
[Chat Persistence — History replay is one shared loader](../architecture/chat-persistence.md#history-replay-is-one-shared-loader).

### Tool argument inspection

Both `ChatMessageToolCall` and `ChatMessageToolApprovalRequest` carry the call's `args` over the wire as the project-wide `JSON` scalar
(`graphql-scalars`' `JSONResolver`). The mappers thread the persisted JSONB column straight through; no per-tool GraphQL typing — the shape
is whatever the tool's Zod schema produced at the agent boundary.

In `<ChatMessage />`, a shared `ToolArgumentsButton` renders a small icon-only `BracesIcon` button (tooltip: "Show arguments"). Hidden by
default in the sense that nothing is visible until the user clicks it; the button itself is always rendered next to the tool name. Clicking
opens a Radix `<Dialog />` with `JSON.stringify(args, null, 2)` inside a `<pre>` block. The dialog title shows the tool name; the body
scrolls if the payload is large. `JSON.stringify` is wrapped in a `try/catch` so a malformed payload renders a human note instead of
crashing the dialog — in practice tool args are plain JSON, but the column is `unknown` so the guard is cheap insurance.

Tool **results** are not exposed; the assistant interprets the result and emits a follow-up text turn (see
[Chat Foundation](../architecture/chat.md#tool-call-arguments-are-exposed-tool-results-are-not)).

### Read-aloud

Every assistant text message renders a small **read-aloud transport** next to the Copy button. Clicking the primary button POSTs the cleaned
message text to `/api/tts`, which calls **Gemini TTS** (`gemini-2.5-flash-preview-tts`, voice `Zephyr`) server-side and returns MP3 audio.
The browser plays it via `MediaSource` — bytes are appended to a `SourceBuffer` as they arrive, so playback starts on the first ~100 ms of
audio rather than the full download. Neural-quality output regardless of OS or browser; no on-device voices used.

The primary button walks through four states — speaker icon (idle) → animated spinner (loading, while the API call is in flight) → pause
icon (playing) → play icon (paused). A separate **stop** button (filled square) appears alongside the primary while audio is playing or
paused; it hard-resets to idle so a subsequent click starts from position 0. Pause keeps the audio element and its buffered MP3 in place, so
resuming picks up exactly where it left off — nothing is re-fetched or re-synthesized. Native pause/play events (mediaSession, media keys,
headphone unplug) sync into the same state via listeners on the `HTMLAudioElement`. `speak()` on any button hard-stops any prior playback
(or pause) app-wide before starting, so two messages can never overlap.

The message body is markdown, so it goes through a small stripper before the API call — code fences are replaced with a spoken "Codeblock" /
"code block" placeholder, backticks/asterisks are dropped, links keep the label only, list markers and headings are stripped. The text is
fed to Gemini as plain prose; language is auto-detected by the model (no explicit `lang` param needed).

**Caching.** Identical `(text, voice, model, format)` tuples resolve to the same SHA-256 key, and the resulting MP3 is persisted in the
`TtsAudioCache` table. A cache hit skips Gemini entirely and returns the bytes in one response with `Cache-Control: private, max-age=86400`
so the browser's HTTP cache handles subsequent listens for free. The cache is anonymous — no `userId` — because the same message body always
produces the same audio.

**Chunked streaming synthesis.** On cache miss, the server splits the text into ~300-character chunks along sentence boundaries
(`src/web/utils/textToSentences.ts`), synthesizes each chunk serially via Gemini, and feeds the raw PCM through a single long-lived
`ffmpeg-static` process that transcodes to MP3 on the fly. MP3 bytes are teed to the response `ReadableStream` and to a Buffer accumulator;
on ffmpeg close the completed clip is written to `TtsAudioCache`. Client disconnect kills ffmpeg and skips the cache write, so a partial
stream can never poison the next request.

**Pre-warm on hover / focus.** `SpeakButton` fires `preload(text)` on `onMouseEnter` / `onFocus`, so the fetch is already in flight by the
time the user actually clicks. `useSpeechSynthesis.preload()` de-dupes on `text` and adopts the in-flight response when `speak()` is called
with the same string. Hovering a different button aborts the previous preload; leaving the button without clicking keeps the preload for a
30 s grace window (long enough that the click after a moment of hover still benefits, short enough that idle mouse-overs don't hold requests
open). Because of the cache, the only Gemini call a hover-then-never-click pays for is the very first hover on a given message across the
app's lifetime.

- API route: `src/routes/api/tts.ts` — POST, no `userId` required (anonymous visitors get TTS too). Uses `GOOGLE_GENERATIVE_AI_API_KEY`.
  Cache miss returns a chunked `audio/mpeg` stream (`Cache-Control: no-store` — the completed clip is cached server-side but the
  intermediate stream is not). Cache hit returns the full clip with `Cache-Control: private, max-age=86400` and an `ETag` matching the
  content hash. `sessionUpsert` runs on every request as the anchor for a future rate limit.
- Hook: `src/web/hooks/useSpeechSynthesis.ts` — fetch-based, `state: 'idle' | 'loading' | 'playing' | 'paused'`. Exposes `speak`, `pause`,
  `resume`, `stop`, `preload`. `stop` aborts the in-flight fetch, kills the `MediaSource` pump, and pauses the `Audio` element; `pause` and
  `resume` toggle without tearing anything down. Progressive fallback to a blob-download path when `MediaSource` or `audio/mpeg` support is
  unavailable.
- Cache: table `TtsAudioCache` (`src/server/db/schema.ts`), query `ttsAudioCacheLoad`, command `ttsAudioCacheUpsert`, key helper
  `ttsContentHash` — SHA-256 of `${text}|${voice}|${model}|${format}` so a wire-format migration never returns stale bytes.
- Transcoder: `src/server/utils/audioTranscode.ts` — streaming PCM → MP3 via `ffmpeg-static` (pinned binary, libmp3lame compiled in, no
  `apt-get` layer in the Dockerfile).
- Markdown stripper: `src/web/utils/markdownToPlainText.ts` — deterministic regex pass; no `remark`/`unified` dependency.
- Sentence splitter: `src/web/utils/textToSentences.ts` — regex pass with a greedy ~300-char coalesce.
- Button: `SpeakButton` in `src/web/components/chat-message/shared.tsx`, alongside `CopyButton`. Both surfaces (workspace assistant and the
  visitor "Ask me anything" chat) inherit the affordance because `<ChatMessage />` is shared.
- **Live-stream reading is still out of scope.** The button reads the final persisted `ChatMessageAssistantText.body`, not the live
  `ChatUpdateAssistantTextChunk` deltas. Chunked synthesis reduces first-audio latency for the completed message; reading the message while
  it's still streaming would require hooking `useChatLiveUpdates` and can be added later.

### Tool approval flow

When the composer is in **manual** mode, every approval-gated tool the agent registers suspends the agent loop instead of executing. **Phase
1 ships no gated tools** — the visitor chat agent only uses `toolPromptUserForInput` (which has no `execute` and is not gated). The Phase 2
personal-assistant agent will be the first to register real gated tools. The flow below is preserved because the plumbing — and its tests —
already exist:

1. **Suspend.** `agentUserConversation` builds each gated tool with `needsApproval: assistantOptions.requireToolCallApprovals`. When the
   model calls one, the AI SDK skips `execute` and emits a `tool-approval-request` content part on the step.
2. **Persist the request.** `chatAssistantTurnRun.onStepEnd` scans `step.content` for `tool-approval-request` parts and writes a
   `chatMessagesToolApprovalRequest` row carrying `(approvalId, toolCallId, toolName, toolArgs)`. The matching tool-call entry in
   `step.toolCalls` is filtered out of the normal tool-call persistence loop — it has no result yet, and a result row will land naturally on
   the resumed turn.
3. **Render.** `<ChatMessage />` switches on `ChatMessageToolApprovalRequest`. The route only passes `onApprovalRespond` for requests whose
   `approvalId` does not yet have a matching `ChatMessageToolApprovalResponse` in the transcript — historic approve/decline pairs render
   read-only.
4. **Respond.** `chatToolApprovalRespond` (inline `gql` for the same `typescript`/`typescript-operations` collision reason as the other
   inlined mutations) is now a thin command:
   - Reloads the request and refuses if a response already exists.
   - Writes one `ChatMessageToolApprovalResponse { approvalId, approved, reason }` row.
   - Resumes via `chatAssistantTurnRunDetached` with the same `assistantOptions` the route passed in (still `requireToolCallApprovals: true`
     — if the LLM follows up with another gated call it surfaces its own approval card).

   The respond command does **not** import any tool definitions, re-validate args, or call `execute`. Tool execution is owned by the AI SDK
   on the resumed turn.

   The optional `reason` is a free-text justification the human typed when responding. The Approve button still commits in one click; the
   Decline button flips the card to a two-step state with a `<Textarea placeholder="Optional: why decline?">` and a "Confirm decline" /
   "Cancel" pair. Empty reasons are persisted as `null`. The schema is symmetric — `reason` is valid on approve too — so an "approve with
   justification" UX can land later without another migration; today only Decline exposes the textarea. The reason rides through to the LLM
   via the SDK `tool-approval-response` part (see step 5) so the model sees _why_ a call was declined instead of a generic
   "execution-denied".

5. **SDK-driven resume.** `toModelMessages` replays the stored approval rows: the request becomes an assistant message holding both a
   `tool-call` part and a `tool-approval-request` part; the response becomes a `tool` message with a `tool-approval-response` part carrying
   `{ approvalId, approved, reason? }`. The SDK's `collectToolApprovals` helper sees the response as the last tool message and runs the
   approved tool's `execute` itself (or pushes a synthetic `execution-denied` tool-result for declines, with the human's `reason` attached)
   before stepping the LLM. The natural tool-call/tool-result round-trip the SDK produces is then persisted by `onStepEnd` as a normal
   `ChatMessageToolCall` row whose `toolCallId` matches the original suspended call — so subsequent replays see a coherent transcript
   without the respond command having had to synthesize anything.

Storage cost of this design is one extra spine + variant row per approval (the response) plus the eventual tool-call row written by the
resumed turn's `onStepEnd`. The alternative — replaying approvals through AI SDK's UIMessage-level approval protocol — would have required
threading a parallel transport through the server that does not align with the project's UI-shaped persistence (see
[Chat Persistence](../architecture/chat-persistence.md)).

The earlier manual-execute approach (a shared tool registry, re-validated args, hand-synthesized tool-call rows with a `+1ms` ordering hack)
was deleted in favor of letting the AI SDK's `collectToolApprovals` run `execute` itself on the resumed turn. See
[Chat — Removed alternatives — Manual tool execution in the approval respond command](../architecture/chat.md#manual-tool-execution-in-the-approval-respond-command)
for the rationale.

### Attachments

The composer accepts file attachments and the full upload → persist → render → replay path is wired end-to-end. Each tile in the preview row
carries its own upload lifecycle (`uploading | uploaded | error`) so multiple files settle independently while the user keeps typing or
dragging more in. Send is gated on (text or at-least-one-attachment) AND no in-flight uploads.

Behavior rules baked into `<MessageComposer />`:

- The paperclip icon-button sits in the bottom addon, immediately left of the Send button (Send keeps `ml-auto` only when attachments are
  disabled, so the right-cluster stays right-aligned in both modes).
- Clicking it opens a hidden `<input type="file" multiple>` (clamped to one file when `multipleAttachments={false}`). The picker resets its
  value after every change so the same file picked twice in a row still fires `change`.
- The whole `<form>` is the drop zone. `dragenter` / `dragleave` are reference-counted via a depth ref so the highlight stays stable when
  the cursor crosses inner children (textarea, addon, preview tiles). `dragover` calls `preventDefault` so the `drop` event fires; non-file
  drags (text/links) are ignored. Drops while the composer is `disabled` or `busy` are no-ops.
- Each preview tile is a 64-pixel square with a thumbnail (image MIME types, via `URL.createObjectURL` revoked on unmount) or a file icon +
  filename fallback. While the tile is `uploading`, a translucent overlay carries a spinner; on error the overlay flips to destructive
  styling with a `CircleAlertIcon` (the failure message rides on the tile's `title` attribute for tooltip-style hover). The remove button is
  a circular X anchored to the top-right, outside the tile box. Tile keys are the parent-assigned `localId` — `File` carries no stable id of
  its own.
- The composer is purely presentational — uploads, retries, and the eventual `fileUploadId → mutation` hop all live in the parent
  (`<ChatComposer />`). The component reads the typed `ComposerAttachment` discriminator and emits `onAttachmentsAdd` / `onAttachmentRemove`
  callbacks; it never touches the network.

#### Upload pipeline

1. **On attach**, the composer hands the new `File[]` to `<ChatComposer />`. The chat composer assigns each one a fresh `localId`, pushes
   onto its `ComposerAttachment[]` state with `status: 'uploading'`, and fires `uploadFile(file)` (`src/web/chat/fileUpload.ts`) per file.
2. **`uploadFile`** POSTs `multipart/form-data` to `/api/file-uploads` (`src/routes/api/file-uploads.ts`). The handler upserts the session
   via the same cookie path the GraphQL handler uses, validates the file against a 10 MB cap, and writes one `FileUploads` row per upload
   via the `fileUploadCreate` command. Response: `{ fileUploadId, filename, mediaType, size }`. The route is consumer-agnostic — chat is its
   first consumer, but other surfaces use the same endpoint.
3. **On settle**, the chat composer flips the per-tile status to `uploaded` (carrying the server-side `fileUploadId`) or `error` (carrying
   the response message). Errored tiles stay on screen so the user can decide to remove and re-add.
4. **On send**, the chat composer collects all `fileUploadId`s from `uploaded` tiles and forwards them through the existing
   `chatMessageCreate` mutation as the new optional `fileUploadIds: [ID!]` arg. Errored tiles are dropped from the mutation; uploaded tiles
   ride along.
5. **Server-side**, `chatMessageCreate` (`src/server/commands/chatMessageCreate.ts`) validates ownership (every requested `fileUploadId`
   must belong to the requesting user; mismatched ids fail loud and return `null`) and writes a `ChatMessageUserAttachments` join row per
   attachment in send-order inside the same `chatMessageAppend` transaction that commits the user message. The `MessageAppended` payload
   then carries `ChatMessageUser.attachments` so the subscription delivers the full bubble shape — no second round-trip.
6. **Render**: `<ChatMessageUser />` renders an attachment row above the bubble. Image MIME types render an inline thumbnail linking to
   `/api/file-uploads/:id`; everything else renders as a 64 px chip with a `<FileIcon />` and the filename. The download route
   (`src/routes/api/file-uploads_.$fileUploadId.ts` — the trailing underscore opts out of TanStack's nested-route grouping with the
   `/api/file-uploads` upload route, so the two siblings don't collapse into a layout) authorizes by user ownership today (chats don't yet
   model membership) and streams the bytes back with the persisted media type. In dev, a tiny Vite middleware in `vite.config.ts` strips
   `Sec-Fetch-Dest` for `/api/*` so `<img>` requests aren't diverted into Vite's static-asset pipeline before Nitro can route them — see
   [API Layer — Dev-only Sec-Fetch-Dest strip](../architecture/api-layer.md#dev-only-sec-fetch-dest-strip).
7. **LLM replay**: `toModelMessages` (`src/server/mappers/toModelMessages.ts`) emits user content as a parts array when a message has
   attachments — `[{ type: 'text', text: body }, ...fileParts]`. Every attachment rides through the unified `FilePart` shape with the
   persisted media type — image MIME types use `mediaType: 'image/*'` (`ImagePart` is deprecated in AI SDK v7). Bytes are inlined out of the
   joined-row payload (`userAttachments` on `ChatMessageRowJoined`) so the agent has everything it needs in memory without a second DB hop.
   Plain-text turns still emit the cheap `content: string` shape.

#### Persistence shape

The bytes live in the template-wide [`FileUploads`](../architecture/file-storage.md) store
(`(fileUploadId, userId, filename, mediaType, size, bytes BYTEA, createdAt)`). A chat-specific `ChatMessageUserAttachments` join row pins
each upload to a user message in `position` order. See [Chat Persistence — Attachments](../architecture/chat-persistence.md#attachments) for
the rationale.

#### Preview & navigation

The user-message bubble renders attachments through a **tile grid** capped at 4 squares (`<ChatAttachmentTileGrid />` in
`src/web/components/chat-message/`). The grid uses one column at a fixed compact width (`w-64 max-w-full`) when there is exactly one
attachment, so the bubble shrinks to fit the lone tile instead of stretching past it; with two or more attachments it switches to a 2-column
grid that fills the bubble. Once a message has more than four attachments the 4th cell becomes a `+{N - 3}` overflow square; the 3-tile +
1-overflow shape is identical on every viewport so the layout stays predictable on narrow phones. Each tile is a `<button>`, so clicking
anywhere on it opens an in-app preview dialog instead of navigating away — the previous "open in new tab" behaviour is now a button inside
the dialog.

`<ChatAttachmentPreviewDialog />` (`src/web/components/chat-message/`) is the controlled preview surface:

- **Type dispatch** lives in `chatAttachmentPreview.ts` (`previewKindFor`):
  - `image/*` → inline `<img>` capped at `max-h-[70vh]`.
  - `text/markdown` (and `text/x-markdown`) → fetched and rendered through `<AssistantMarkdown />`, the same Streamdown pipeline assistant
    text uses, so an `.md` attachment looks identical to an assistant reply with the same content.
  - `text/*`, plus the common code-ish set (`application/json`, `application/yaml`, `text/csv`, `application/javascript`, etc.) → fetched
    and rendered in a wrapping `<pre>` block.
  - everything else → a generic info card with filename, size, and mime type. Open / Download remain available in the footer.
- **Text fetch** is a same-origin `fetch(attachment.url)` (the cookie auth that gates `/api/file-uploads/:id` for inline images applies
  unchanged), wrapped in a small `useEffect` with an `AbortController` so closing the dialog or moving to the next attachment cancels the
  in-flight request. The fetched body is cached per `fileUploadId` for the dialog's lifetime so flipping back and forth doesn't re-download.
- **Navigation**:
  - Prev / Next chevron buttons overlay the body's left/right edges when the message has more than one attachment.
  - `ArrowLeft` / `ArrowRight` (window-level `keydown`) move the index, wrapping at both ends.
  - Clicking the `+X` tile opens the dialog at index 3 (the 4th attachment); the user reaches the rest by stepping forward from there.
    Single-attachment messages render no nav controls.
- **Footer buttons** are `<a>` tags styled via `<Button asChild>`:
  - **Open in new tab** → `<a href={url} target="_blank" rel="noreferrer">`.
  - **Download** → `<a href={url} download={filename}>`. The route serves `Content-Disposition: inline`, so the `download` attribute is what
    flips the browser into save-as mode and uses the persisted filename.

## Future Work

The current minimum doesn't yet implement:

- **Chat list / sidebar.** New chats are reachable only via the `?chatId` URL.
- **Multi-tab / multi-device sync.** The `chatUpdates` subscription is keyed by the per-turn `generationId`, so a chat opened in a second
  tab doesn't see live updates from a turn started in the first tab. Once chats grow user ownership, a chat-level subscription (with real
  authorization) replaces or augments the generationId-keyed one.
