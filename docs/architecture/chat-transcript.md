# Chat transcript

> **Presentation rules for every chat surface** — paddings, max-widths, scroll behaviour, copy/TTS row, composer states — live in
> [`docs/styles/chat.md`](../styles/chat.md). This doc is about the scroll primitive itself and how the surfaces plug into it.

## Context

Four surfaces render an admin, visitor, or interviewer transcript today:

- **Workspace assistant sidebar** — `src/web/chat/WorkspaceAssistantChatBody.tsx`, mounted in the shadcn Sidebar and in a mobile Sheet.
- **Workspace assistant deep-link route** — `/workspace/assistant/<chatId>` at `src/routes/{-$locale}/workspace/assistant.$chatId.tsx`.
- **Visitor "Ask me anything" sheet** — `src/web/chat/WebsiteVisitorAssistantChatSheet.tsx`, mounted once at the root layout.
- **Workspace compass interview** — `src/routes/{-$locale}/workspace/compass.tsx` (`InterviewView`), which uses the `MessageScroller`
  primitives directly (`src/web/chat/CompassInterviewTranscript.tsx`) rather than `ChatTranscript`, because a `CompassInterviewMessage`
  isn't part of the `ChatMessage` union and doesn't need the tool-call / approval / input-collection dispatch. Streaming rides a parallel
  `compassInterviewUpdates` subscription with a dedicated `useCompassInterviewLiveUpdates` hook — see
  [`docs/features/workspace-compass.md`](../features/workspace-compass.md).

Before this component existed each surface hand-rolled the same 40-line block: a scroll ref, a `useLayoutEffect` that pinned the container
to `scrollHeight` when a signature over `messages.length + streaming buffer lengths` changed, an `onScroll` handler that flipped an
`isAtBottom` state below a 64px threshold, and a `<button>` "jump to latest" pill parked at `absolute bottom-3 left-1/2`. It worked for the
happy path — the transcript stayed pinned while you were reading the bottom, and the pill appeared when you scrolled up — but every hard
case of streamed chat scroll was broken:

- **Auto-scroll interrupted the reader.** Someone half-way up the transcript would be yanked to the bottom whenever the AI streamed a chunk
  if their `isAtBottom` had bounced true for a frame (short scroll containers, small viewports).
- **New turns dropped in at the bottom.** A fresh user question and its streamed reply arrived _below_ everything visible, so the reader had
  to hunt for where the new turn started.
- **Saved conversations opened at the absolute bottom.** Bookmarking `/workspace/assistant/<chatId>` and returning to it dropped you at the
  end of the transcript, past the last user prompt, with no context about what the reply was answering.
- **Prepended history would jump the scroll.** Not a problem today (we don't paginate transcript history yet), but any future "load older
  messages" affordance would have to reimplement the scroll-preservation logic from scratch.

## Decision

Extract a shared `ChatTranscript` component at `src/web/chat/ChatTranscriptShared.tsx` (the "Shared" suffix keeps it distinct from the
neighbouring `chatTranscript.ts` helpers on case-insensitive filesystems). Delegate the scroll behaviour to shadcn's `MessageScroller`
primitive (`src/web/components/base/message-scroller.tsx`), which wraps `@shadcn/react/message-scroller` — a purpose-built chat-scroller
that models the "great streaming chat" behaviours documented at <https://ui.shadcn.com/docs/components/base/message-scroller>:

- **Follows only while the reader is at the live edge.** If they scroll away — or select text, use the keyboard, or open a link — the stream
  stops pulling them.
- **Anchors new turns near the top of the viewport.** A fresh reply grows into the screen instead of pushing everything up.
- **Opens saved transcripts at the last anchor.** `defaultScrollPosition="last-anchor"` lands the reader at the last meaningful turn
  (usually the last user message), not the absolute bottom.
- **Preserves position when older history is prepended.** Any future "load more" affordance gets this for free.
- **Announces new content out of view.** The "jump to latest" pill re-uses `MessageScrollerButton direction="end"` with the primitive's
  `data-active` state; the button animates in only when the user is scrolled away, and the transitions ship with the primitive.

Every persisted message row and every in-flight streaming buffer is wrapped in a `MessageScrollerItem` with `scrollAnchor`. That's how
`MessageScroller` knows which rows are candidates for the "last-anchor" restore and for anchoring new turns.

## Composition

```
MessageScrollerProvider (defaultScrollPosition="last-anchor", scrollEdgeThreshold=64)
└── MessageScroller
    ├── MessageScrollerViewport   (default: scroll-fade-b, scrollbar-thin, overflow-y-auto,
    │   │                         [scrollbar-gutter:stable] pr-2 — baked in so bubbles never
    │   │                         sit under the scrollbar)
    │   └── MessageScrollerContent  (default: flex-col gap-8)
    │       ├── initial-fetching spinner (only if `initialFetching` and no messages)
    │       ├── date-grouped sections
    │       │   ├── <Marker variant="separator"> with the day label
    │       │   └── <MessageScrollerItem scrollAnchor> per top-level TranscriptMessage
    │       │       └── <ChatMessage />
    │       └── streaming section
    │           └── <MessageScrollerItem scrollAnchor> per in-flight buffer
    │               └── <AssistantMarkdown streaming />
    └── MessageScrollerButton direction="end"  ("Jump to latest" pill)
```

`ChatTranscript` is intentionally scoped to the scroll container. It does not own:

- **The message union.** `ChatMessage` (`src/web/components/chat-message/index.tsx`) still owns the dispatch to `ChatMessageUser`,
  `ChatMessageAssistantText`, `ChatMessageToolCall`, `ChatMessageToolApprovalRequest`, `ChatMessageToolApprovalResponse`, and
  `ChatMessageAssistantInputCollection`.
- **The mutations.** `onCollectionSubmit` and `onApprovalRespond` are injected by the caller. The workspace surfaces use the `admin.*`
  namespace (`WorkspaceChatInputCollectionRespond` / `WorkspaceChatToolApprovalRespond`); the visitor sheet uses the visitor-namespace
  equivalents. Same component, different `admin` / non-admin dispatch.
- **The composer.** Each surface parks its own `<ChatComposer />` (or `<VisitorChatComposer />` / `<WorkspaceChatComposer />`) below the
  transcript.

## shadcn primitives used

Adopted from the shadcn New York v4 registry, adapted to this repo's conventions (`../../utils/cn` import path, existing `Button` reused).
The utility CSS lives in `shadcn/tailwind.css`, imported at the top of `src/styles.css`.

| Primitive                                                                         | File                                           | Where it lands                                                                                                                                                            |
| --------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MessageScroller` (+ Provider / Viewport / Content / Item / Button)               | `src/web/components/base/message-scroller.tsx` | Backing store of `ChatTranscript`.                                                                                                                                        |
| `Marker`                                                                          | `src/web/components/base/marker.tsx`           | `variant="separator"` for the day-bucket dividers inside the transcript.                                                                                                  |
| `Attachment` (+ Media / Content / Title / Description / Actions / Action / Group) | `src/web/components/base/attachment.tsx`       | Composer-side attachment tiles inside `MessageComposer.tsx`. `AttachmentGroup` wraps the tile row and ships with `scroll-fade-x` so long lists stay browsable.            |
| `shimmer` utility                                                                 | shipped by `shadcn/tailwind.css`               | The `Thinking…` placeholder in `AssistantMarkdown.tsx` while a streaming buffer is empty.                                                                                 |
| `scroll-fade` utilities                                                           | shipped by `shadcn/tailwind.css`               | `scroll-fade-y` on the sidebar's chat browser list, `scroll-fade-b` on the transcript viewport (via `MessageScrollerViewport`), `scroll-fade-x` inside `AttachmentGroup`. |

## Tool-row shimmer, status, and result — the "working on it" signal

Tool-call rows sit on the left rail (`MessageRow side="system"` → `justify-start`) and render through `ToolRowShell`
(`src/web/components/chat-message/shared.tsx`): a friendly bilingual tool label (from `toolDisplay()`), a **status glyph**, the args/result
inspector, a timestamp, and — when the tool returned a summary — an **expandable one-line result summary** beneath the pill.

A persisted `ChatMessageToolCall` already carries its `toolResult` — it is a record of a completed step, not a live thing. The only live
state worth signalling is "the turn is still going and hasn't started streaming text yet." That is a **turn-level** signal, so it is not on
the wire per row: `ChatTranscript` takes an `isGenerating` prop (from `useChatLiveUpdates().isGenerating(chatId)` — per chat, see below)
plus a `liveTurnMessageIds` set (the ids the current, still-running turn has appended, from `liveTurnMessageIdsFor(chatId)`). When
`isGenerating && streamingTexts` is empty, it marks the **last top-level tool-call message** `active` **only if that row's id is in
`liveTurnMessageIds`**. `ToolRowShell` then adds the shadcn `shimmer` class to the label and a trailing `…`. Once a streaming text buffer
opens or the turn ends, `active` drops and the pill settles.

The `liveTurnMessageIds` gate is what keeps the shimmer honest across the two ways a stale row used to light up: (1) sending a **new**
message in a chat that already has a completed tool call — the prior tool call is not in the new turn's live set, so it stays settled; (2)
an **unrelated** chat that isn't generating — its live set is empty, so nothing shimmers. The derivation is the pure
`activeToolCallId(topLevel, liveTurnMessageIds, isGenerating, hasStreamingText)` helper in `chatTranscript.ts` (unit-tested in
`chatTranscript.test.ts`).

This keeps the shimmer a live signal (matching `AssistantMarkdown`'s `Thinking…` sweep) rather than a decorative loop on every settled row —
the distinction [`docs/styles/motion.md`](../styles/motion.md) draws. Under `prefers-reduced-motion` the shadcn `shimmer` utility degrades
to static text automatically, and the trailing `…` still conveys the state without motion.

**Result → status + summary.** `interpretToolResult(result, active)` (`src/web/chat/toolResult.ts`) collapses the row's `toolResult` into a
`{ status, summary }` view. `active` short-circuits to `inProgress` (spinner). Otherwise it reads the `delegateTo*` convention —
`{ status: 'completed' | 'partial' | 'needsMoreInfo' | 'noOp' | 'failed', summary }` — flagging `failed` (spinner→alert, destructive tint)
on an explicit `status: 'failed'` or a top-level `error`, and surfacing the `summary` string inline. Anything else is a neutral "done" with
the raw JSON available only in the inspector dialog (`ToolArgumentsButton`, Arguments + Result sections). The `toolResult` field is exposed
on the `ChatMessageToolCall` GraphQL type and selected in the shared `ChatMessageFields` fragment, so it rides both the initial query and
the `chatUpdates` subscription (the streaming append swaps in the persisted row with its result, keyed on the same id — no flash).

## Internal vs external links

Assistant messages render markdown through `AssistantMarkdown.tsx` (Streamdown). The default Streamdown anchor routes **every** href —
relative ones included — through its own "you're about to visit an external website" modal and always opens a new tab. That is wrong for
links to pages on this site: the assistant is prompted to point visitors at `/cv`, `/projects`, etc., and those should feel like normal
in-app navigation. So the renderer overrides the `a` component with a custom `MarkdownAnchor` that splits three ways:

- **Incomplete** (`streamdown:incomplete-link`, emitted mid-stream) → styled but inert, so a half-streamed link isn't clickable.
- **Internal** (`isInternalHref` — a single leading slash, not the `//host` protocol-relative form) → a plain same-tab `<a>` whose click is
  intercepted for `router.navigate({ href })` (SPA, no reload, no interstitial). The path is locale-prefixed to match the route the visitor
  is on: `localeFromPathname(router.state.location.pathname)` reads the current locale and `localizeInternalHref` turns `/cv` into `/en/cv`
  on an English page (and leaves an already-prefixed path alone). Modified clicks (⌘/Ctrl/Shift/Alt, non-primary button) fall through to the
  browser so "open in new tab" still works. Streamdown's injected `target`/`rel` are stripped on this branch.
- **External** → preserves the per-surface behaviour encoded by `ExternalLinkConfirmationProvider` (see below).

`ExternalLinkConfirmationProvider` gates only **external** links. The public visitor chat leaves it at the default (`enabled: true`) so
off-site links get a bilingual confirmation `AlertDialog` before opening in a new tab; the workspace assistant wraps its transcript with
`enabled={false}` (in `WorkspaceAssistantChatBody.tsx`) so its links to trusted surfaces open directly. Internal links ignore this flag
entirely — they always navigate in-app.

`useRouter({ warn: false })` is used (not `useParams`) so the anchor degrades to a plain anchor outside a `RouterProvider` (Storybook, SSR)
instead of throwing. Behaviour is locked down in `AssistantMarkdown.test.tsx` (internal same-tab + locale prefixing; external confirm vs
direct per surface) plus unit tests for the three pure helpers.

## What was intentionally not adopted

- **`Bubble`.** Assistant markdown in this app is not bubbled — the assistant text renders flush in the row so long-form markdown and code
  blocks are unclipped. The current `Bubble({ tone: 'user' | 'assistant' })` in `src/web/components/chat-message/shared.tsx` covers only the
  user side and matches the site's brand-tinted rounded-2xl treatment; adopting shadcn's `Bubble` would re-frame assistant text and lose
  that.
- **`Message`.** shadcn's `Message` centralises avatar + alignment + header + footer. The chat surface here has no avatars, and the existing
  `MessageRow({ side: 'user' | 'assistant' | 'system' })` handles a three-way split (the `system` side is where tool-call pills land).
  Adopting `Message` would either invent avatars we don't want or leave slots empty.
- **`Marker` for tool-call pills.** The tool-call and approval-response rows render as centred rounded pills with an args button and a
  timestamp — a distinct visual language from `Marker`'s full-width row with border/separator lines. Retaining the pill treatment keeps
  system rows visually distinct from date separators.

## Document attachments and the editor panel

A `workspaceFileCreate` tool call (the assistant drafting a markdown document) renders in the transcript as the usual tool pill **plus** a
clickable **document attachment card** beneath it — `ChatMessageToolCall.tsx` reads `{ workspaceFileId, filename, label }` straight off
`toolResult` (no schema field, no link table). Clicking the card opens the file in the assistant sidebar's **file-display state**.

The card's behavior is injected via `DocumentPanelProvider` (`src/web/chat/DocumentPanelProvider.tsx`) — the same context pattern as
`ExternalLinkConfirmationProvider`, so the card doesn't need a prop threaded through the transcript. Both assistant transcripts (the docked
sidebar body and the full-page route) mount it wired to `WorkspaceAssistantChatProvider.openFile`, which flips the shared `openFileId`
state; the sidebar frame renders `WorkspaceFileEditor` in place of the transcript and self-expands if collapsed. Surfaces with no provider
(the public visitor sheet) leave the card inert (`canOpen` false). There is no separate panel, no `?doc` param, and no navigation — the
editor is a third content state of the one existing sidebar.

See [`docs/features/workspace-files.md`](../features/workspace-files.md) for the full feature.

## Key files

- `src/web/chat/ChatTranscriptShared.tsx` — the shared transcript renderer.
- `src/web/components/base/message-scroller.tsx` — shadcn primitive wrapper.
- `src/web/components/base/marker.tsx` — shadcn primitive.
- `src/web/components/base/attachment.tsx` — shadcn primitive.
- `src/web/chat/DocumentPanelProvider.tsx` — per-surface `openDocument` context for the document card.
- `src/web/chat/WorkspaceFileEditor.tsx` — the sidebar file-display editor body (preview/edit/save).
- `src/web/chat/chatTranscript.ts` — union helpers (`groupMessagesByDate`, `partitionByParent`, `findLatestCollectionId`,
  `findPendingApprovalIds`, `findUserInputByCollectionId`, `mergeTranscriptMessages`) plus `activeToolCallId` (the pure trailing-tool-call
  shimmer derivation).
- `src/styles.css` — imports `shadcn/tailwind.css` so the `shimmer` and `scroll-fade` utilities are available.
