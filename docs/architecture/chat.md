# Chat Foundation

> **Phase 1 → Phase 2 note:** today there is a single agent (`agentUserConversation.ts`) used by the public visitor chat hosted in the
> landing-page sheet (`src/web/chat/WebsiteVisitorAssistantChatSheet.tsx`). Phase 2 adds a second agent for the workspace personal
> assistant. The message-persistence and streaming machinery described here is shared between both — see
> [`multi-agent-chat.md`](./multi-agent-chat.md) for the dispatch design.

## Context

The app needs several kinds of chat surface — direct human-to-human conversations, assistant-driven flows, and likely more. They share the
same primitives: a stream of heterogeneous messages, tool-call indications when an assistant is involved, and rich input prompts so the
assistant can collect structured answers without freeform parsing. A single shared model keeps each surface from re-inventing message
polymorphism, picker shapes, and approval round-trips, and prevents the URQL cache from fragmenting along arbitrary lines.

Persistence and LLM replay are out of scope here — see [Chat Persistence](./chat-persistence.md).

## Decision

A polymorphic `ChatMessage` union lives in `src/server/graphql/schema.graphqls` and is consumed by every chat surface in the app. The rest
of this doc walks each piece of the union and the rules that hold across them.

### The message union

```graphql
union ChatMessage =
  | ChatMessageUser
  | ChatMessageUserInput
  | ChatMessageAssistantText
  | ChatMessageToolCall
  | ChatMessageToolApprovalRequest
  | ChatMessageToolApprovalResponse
  | ChatMessageAssistantInputCollection
```

Each variant carries only the fields it actually needs. Codegen produces a TypeScript discriminated union keyed on `__typename`, which gives
exhaustive `switch` checks at the call site without requiring a GraphQL `interface` wrapper. Union resolution uses the project's standard
`gqlTypeName` discriminator pattern — see [Union and Interface Resolution](./api-layer.md#union-and-interface-resolution).

`ChatMessageUser` carries `attachments: [FileUpload!]!`, returned in send-order; the field is non-nullable but always populated (empty list
when the message had none). The bytes themselves live in the template-wide [`FileUploads`](./file-storage.md) store; the chat-specific
concern is the join row that pins them to a message. The LLM-side replay folds the bytes into the v7 `FilePart` shape (with
`mediaType: 'image/*'` for image attachments). See [Chat Persistence — Attachments](./chat-persistence.md#attachments).

### Assistant input collections collect N typed values per turn

A single assistant turn can prompt for several related values at once (e.g. "what dates, how many people, which cuisine?"). Forcing one
input per round-trip would balloon the message log and stall the agent loop on every field. The model is therefore a _collection_ of typed
slots:

```graphql
type ChatMessageAssistantInputCollection {
  chatMessageId: ID!
  prompt: String! # framing for the whole form
  inputs: [ChatAssistantInput!]! # 1..N typed slots, rendered top-to-bottom
  mode: String! # "Form" | "StepThrough" — render mode picked by the LLM
  createdAt: DateTime!
}

union ChatAssistantInput =
  | ChatAssistantInputDate
  | ChatAssistantInputDateRange
  | ChatAssistantInputDateTime
  | ChatAssistantInputTime
  | ChatAssistantInputSingleSelect
  | ChatAssistantInputMultiSelect
  | ChatAssistantInputBoolean
  | ChatAssistantInputText
```

Every variant carries `inputId: ID!` (keys answers back to slots, surviving reorders) and `prompt: String!` (per-slot label, distinct from
the collection-level framing prompt). Variant-specific fields (a select's `options`, a picker's range bounds) live only on the variants that
need them.

There is no `required` flag. Any individual slot may be left blank, and the whole form may be submitted with no answers. "Required" is a
concept the LLM is poorly placed to enforce — it never blocks the agent loop because the user's response shape is the same regardless — and
the UI's job is to make answering low-friction, not to reject incomplete forms.

**Render mode is the LLM's choice.** `Form` shows every slot at once on a single card; `StepThrough` walks the user through one slot at a
time with Back / Skip / Next controls. The submitted answer set is identical between modes — both accumulate drafts client-side and submit
the same `chatInputCollectionRespond` batch. `mode` exists purely for rendering and to round-trip the LLM's choice through the
`toModelMessages` replay.

**Produced by the `promptUserForInput` tool.** The LLM never emits a `ChatMessageAssistantInputCollection` directly. Every agent that needs
structured input is given the `promptUserForInput` tool (`src/server/agents/toolPromptUserForInput.ts`). Its Zod input schema mirrors the
union above; the tool has no `execute`. Two pieces of plumbing turn the tool call into the on-screen form:

1. **`chatAssistantTurnRun` translates at persistence time.** When `onStepEnd` sees a tool call named `promptUserForInput`, it writes a
   `chatMessagesAssistantInputCollection` row (assigning each slot a fresh `inputId`) instead of the generic `chatMessagesToolCall` row.
   Without this branch the form would render as the bland "Called `promptUserForInput`" pill every other tool gets.
2. **The agent loop stops on this tool call.** `agentUserConversation` lists `hasToolCall('promptUserForInput')` alongside `isStepCount(8)`
   in `stopWhen`. Because the tool has no `execute`, there is no result to feed back into the loop — the next turn-taker is the human.
   Without this stop condition, Gemini would keep stepping and tend to apologize that "the tool failed", producing a phantom assistant text
   right next to the form.
3. **Any preamble text from the stopping step is dropped at persistence time.** The system prompt coaches the model to narrate briefly
   before calling `promptUserForInput` ("respond briefly, then ..."), so Gemini almost always emits a few words alongside the tool call.
   `chatAssistantTurnRun` tracks whether the stopping step contained a `promptUserForInput` call and, when it did, skips the trailing
   `chatMessagesAssistantText` insert. Persisting that preamble would push the freshly-inserted `assistantInputCollection` row out of the
   transcript tail, and the interactivity rule (next bullet, plus `findLatestCollectionId` in `web/chat/chatTranscript.ts`) locks every
   collection that isn't the tail — the Submit button would never render. The streaming preview still surfaces the preamble live during the
   turn; `TurnEnded` clears it client-side.

The user's reply is a `ChatMessageUserInput`. On the next round, `toModelMessages` replays the collection as a `promptUserForInput`
tool-call and the `ChatMessageUserInput` as the matching tool-result, so the LLM sees its own original turn shape — see
[Chat Persistence](./chat-persistence.md).

### User input is one append-only message per collection

A user's reply to a collection is one message carrying every answered slot:

```graphql
type ChatMessageUserInput {
  chatMessageId: ID!
  author: User!
  collectionMessageId: ID! # which form is being answered
  answers: [ChatMessageUserInputAnswer!]!
  createdAt: DateTime!
}

type ChatMessageUserInputAnswer {
  inputId: ID!
  value: ChatAssistantInputValue!
}

union ChatAssistantInputValue =
  | ChatAssistantInputValueDate
  | ChatAssistantInputValueDateRange
  | ChatAssistantInputValueDateTime
  | ChatAssistantInputValueTime
  | ChatAssistantInputValueString
  | ChatAssistantInputValueStringList
  | ChatAssistantInputValueBoolean
```

**Submit is all-or-nothing.** One `ChatMessageUserInput` per collection; the message log stays append-only and the "is this still
actionable?" check stays a render-time peek at the tail. Per-field submission would force partial state on the server and break that
contract. Within a single submit, every slot is independently optional — Submit is always enabled and partial (or fully empty) answers are
valid.

**The userInput row is folded into its collection's card, not rendered as its own message.** The card switches between three states based on
whether (and how) it has been answered:

- **Pending** — no userInput exists yet, AND the collection is the last message in the chat. Renders the interactive form with a single
  Submit button (always enabled).
- **Answered** — userInput has `answers.length > 0`. Renders a compact `prompt → formatted answer` summary with an "✓ Answered · {time}"
  footer.
- **Skipped** — userInput has `answers.length === 0` (the synthetic pivot row, below). Renders the questions muted with a "Skipped · {time}"
  footer.

The userInput row stays on the wire and in the database — `toModelMessages` still emits it as the `promptUserForInput` tool-result on replay
so the LLM sees the same turn shape. It just doesn't have its own visual element. This collapses one logical Q&A into one card and avoids
the post-submit reset and double-submit bugs the standalone-bubble rendering produced.

**Pivoting away produces an empty-answers userInput.** The user is never trapped by a question. The composer stays interactive while a
collection is on screen, and a free-text message implicitly closes the collection. When `chatMessageCreate` runs and the most recent
collection has no matching userInput, it synthesizes an empty-answers row — server-side, in the same transaction as the new user message,
timestamped one millisecond before it — so replay reads `collection → empty userInput → user message`. `toModelMessages` derives a
`status: 'answered' | 'skipped'` flag from `answers.length` and emits the row as a `promptUserForInput` tool-result with
`{ status, answers }`, preserving the AI SDK's "every tool-call has a tool-result" invariant; without that synthetic row, the next agent
step would throw `MissingToolResultsError`. The `promptUserForInput` tool description teaches the model what `skipped` means: drop the
question, pick up whatever the user just said, do not immediately re-ask.

This is deliberately a server-side _repair_, not a UI lock. Locking the composer until the form is submitted would force the user to either
answer or abandon the conversation, which is the wrong default for a chat surface.

### Tool calls expose arguments; results stay private

`ChatMessageToolCall` and `ChatMessageToolApprovalRequest` both carry an `args: JSON!` field. Arguments are user-facing context — they let
the UI render an "inspect arguments" affordance under the tool-call pill and let the human see exactly what the assistant is asking
permission to run before approving. The wire shape is the project's `JSON` scalar (from `graphql-scalars`' `JSONResolver`), passed verbatim
from the JSONB column the agent persists; per-tool typing lives at the tool boundary, not in the schema.

Tool **results** stay private. The schema therefore has no `ChatMessageToolResult` — the assistant interprets the result and emits a
follow-up `ChatMessageAssistantText` or input collection. Adding a result variant would leak structured payloads to the client and duplicate
work the LLM already does.

### Nested tool calls

`ChatMessageToolCall` carries an optional `parentChatMessageId: ID`. When a tool's `execute` runs a sub-agent in-process (today only
`delegateToProjects` does this), every tool call the sub-agent makes is persisted with `parentChatMessageId` set to the parent tool-call
row's id. The transcript groups these via `partitionByParent` (`src/web/chat/chatTranscript.ts`): child rows are filtered out of the
top-level day-grouped list and rendered as an indented block inside the parent's `<ChatMessageToolCall>` view. LLM replay
(`toModelMessages`) ignores the column — each row is still a valid AI-SDK `tool-call` / `tool-result` pair on its own.

The pattern, the FK ordering trick (`preWrittenToolCallIds`), and the shared `chatPersistStep` helper that powers both the orchestrator's
and the sub-agent's `onStepEnd` are documented in [`agent-delegation.md`](./agent-delegation.md#nested-tool-calls).

### Human-in-the-loop approval is a request/response pair, executed by the SDK

Some tools are safe to run autonomously (read-only lookups, idempotent calculations). Others have real-world side effects — DB writes,
outgoing mail, paid APIs, mutating user data. For the latter the assistant must pause and ask before executing.

The flow:

1. The assistant calls a tool whose definition has `needsApproval: true` on `ai`'s `tool()`.
2. The AI SDK suspends the agent loop and emits a `tool-approval-request` content part. `chatAssistantTurnRun.onStepEnd` persists this as a
   `ChatMessageToolApprovalRequest { approvalId, toolName, toolCallId, args }` row and skips writing a tool-call row for the suspended call.
3. The UI renders the request as an Approve / Decline affordance — same render path as any other assistant message, no special channel.
   Decline is a two-step affordance: it reveals an optional free-text textarea ("why decline?") and a Confirm button. Approve commits in one
   click.
4. The human responds via the `chatToolApprovalRespond` mutation, which durably writes a
   `ChatMessageToolApprovalResponse { approvalId, approved, reason }` row and kicks off the next assistant turn detached. The mutation does
   **not** execute the tool itself — execution is owned by the AI SDK. `reason` is optional and schema-symmetric (valid on approve too) so
   "approve with justification" is reachable later without a migration; today only Decline exposes the textarea.
5. On the next turn, `toModelMessages` replays the stored rows: the request becomes an assistant message carrying both a `tool-call` part
   and a `tool-approval-request` part; the response becomes a `tool` message with a `tool-approval-response` part carrying
   `{ approvalId, approved, reason? }`. The SDK's `collectToolApprovals` picks the response up, runs the approved tool's `execute` (or
   pushes a synthetic `execution-denied` tool-result for declines, with the human's `reason` attached so the LLM sees _why_ it was
   declined), and feeds the outcome back into the LLM. The natural tool-call/tool-result round-trip is then persisted by `onStepEnd` as a
   normal `ChatMessageToolCall` row whose `toolCallId` matches the original suspended call.

`approvalId` pairs request and response so multiple in-flight approvals (parallel tool calls, retries) don't get confused. Whether a given
tool requires approval is a property of the tool definition, not of the chat — each chat surface decides its own policy when constructing
its agent (the user-conversation agent threads `assistantOptions.requireToolCallApprovals` into each gated tool factory).

`toModelMessages` is the single boundary that translates the persisted approval rows into the SDK's wire shape. The respond command itself
only writes the response row and kicks off the resumed turn — it never re-validates args, never imports tool definitions, and never calls
`execute`.

Approvals are deliberately separate from input collections: an approval is a control-flow gate over a tool call; an input collection is a
data-collection prompt. Folding them together would conflate "permission to act" with "values to act on".

### Generation metadata rides on every AI-produced variant

Each AI-produced variant (`ChatMessageAssistantText`, `ChatMessageToolCall`, `ChatMessageToolApprovalRequest`,
`ChatMessageAssistantInputCollection`) carries a nullable `generation: ChatMessageGeneration` field with the producing model id and per-step
token usage. The field is nullable because pre-feature rows have no snapshot. The columns are denormalized onto each variant table — see
[Chat Persistence — Generation metadata](./chat-persistence.md#generation-metadata-is-denormalized-onto-every-ai-produced-variant-row) for
the storage shape and the per-step duplication trade-off.

### Live updates flow through one chat-scoped subscription

```graphql
union ChatUpdate = ChatUpdateMessageAppended | ChatUpdateAssistantTextChunk | ChatUpdateTurnEnded

type ChatUpdateMessageAppended {
  message: ChatMessage! # whichever variant just persisted
}

type ChatUpdateAssistantTextChunk {
  chatMessageId: ID! # pre-allocated id of the eventual ChatMessageAssistantText
  delta: String!
}

type ChatUpdateTurnEnded {
  generationId: ID!
}

type Subscription {
  chatUpdates(generationId: ID!): ChatUpdate!
}
```

Every newly persisted message — user message, tool call, approval request/response, input collection, and the final assistant text —
publishes a `ChatUpdateMessageAppended` after the row commits. While the assistant is generating text, each delta publishes a
`ChatUpdateAssistantTextChunk` carrying the **server-pre-allocated** `chatMessageId` of the row that will eventually arrive as
`MessageAppended` at end-of-stream. Clients use that id to swap their in-place streaming preview for the persisted row in the same DOM slot,
so the swap is a true no-op. `ChatUpdateTurnEnded` fires exactly once per turn (success, agent throw, or downstream publish failure) so the
client can tear down its per-turn state without waiting on the kicking-off mutation.

Three rules fall out of this:

- **Subscription is the only live signal.** The page query loads the existing transcript on mount; everything after is the subscription.
  Sends never trigger a refetch.
- **Per-message transactions, publish-after-commit.** Each `(spine + variant)` write commits in its own short transaction; the
  `ChatUpdateMessageAppended` publish runs only after that commit returns. Subscribers therefore only ever see committed truth, and a
  mid-turn crash leaves the partial trail (user message, early tool calls) committed instead of silently rolling everything back. The
  `chats` row for a brand-new chat is committed up front in its own write before the user message inserts so the FK from
  `chatMessages.chatId → chats.chatId` resolves.
- **Auth = unguessable `generationId`.** The client allocates a UUIDv4 per turn; the unguessable id IS the capability. Real chat-level
  authorization will layer on once chats grow user ownership.

The single primitive that implements "commit + publish" is `chatMessageAppend` in `src/server/commands/chatMessageAppend.ts`. Every chat
command (`chatMessageCreate`, `chatInputCollectionRespond`, `chatToolApprovalRespond`) and the agent loop's `onStepEnd` use it; the publish
carries only the new row's `chatMessageId`, and the subscription resolver re-loads the joined row via `chatMessageRowLoad` before delivery —
so subscribers receive a `ChatMessage` identical to what `chatFindOne` would have returned.

### Why the wire payload is the id, not the full message

`PubSubPostgres.publish` round-trips through `pg_notify`, which **caps NOTIFY payloads at 8000 bytes**. A long user message, a fat tool-call
args blob, or a multi-paragraph assistant text would blow the cap, the DB driver would reject the `pg_notify` call, and the chat command
would error after a successful write — committed truth that never reached its subscriber.

The fix is structural: the wire payload — `ChatUpdateWirePayload` in `src/server/graphql/chatUpdateWirePayload.ts` — only carries small
primitives (`{ kind: 'messageAppended', chatMessageId }`, the streaming-chunk delta, or the `turnEnded` marker). The subscription resolver
in `resolversCreate.ts` re-loads the row and maps it to the full `GqlSChatMessage` before handing it to graphql-js. The shape that reaches
the client is exactly what a re-fetch would have returned; the wire payload stays small and fixed-size regardless of message body size.

`PubSubPostgres.publish` enforces this with a 7500-byte hard guard so any future publisher that tries to put a fat value on the wire fails
loudly at the call site, not deep inside the driver. **The rule: fan out via id, not value.**

The shared turn-runner `chatAssistantTurnRun` exposes `chatAssistantTurnRunDetached`, which all three write commands use to fire the
assistant turn on a void promise — the mutation returns as soon as the user-side row is durable, the agent runs detached, and the helper
bumps `chats.lastModifiedAt` after the turn finishes.

The client-side buffers in `useChatLiveUpdates` are scoped to a single chat surface. The hook takes the current `chatId` and resets
`appendedMessages` and `streamingTexts` whenever the surface transitions away from a previously-defined chat (loaded → empty, loaded A →
loaded B). The one transition the hook keeps the buffer through is `undefined → some-id` while a turn is in flight — that's the empty→loaded
handoff `ChatComposer` performs on first send, where the buffered user message and assistant stream legitimately belong to the newly-created
chat. Without this scoping, back-navigating from chat A and starting a new chat B would re-sort A's appended rows into B's transcript by
`createdAt` (since merging is sort-by-timestamp, deduped by id) and the new conversation would appear to be appended onto A until a hard
reload.

### Date grouping is a UI concern, not a schema concern

Reads return a flat insertion-ordered `messages: [ChatMessage!]!`. Day separators are a near-universal chat-UI element, but the live
`chatUpdates` subscription delivers raw messages — so the client has to be the grouping authority anyway, and a server-side regrouping pass
would only run on the initial load before being thrown away. The transcript runs a sequential scan that groups by ISO calendar day
(`YYYY-MM-DD`) using the same boundary the wire `Date` scalar exposes.

### Latest-collection-only is a UI rule, not a schema rule

A `ChatMessageAssistantInputCollection` is interactive only when it is the **last message in the chat**. Any later message — the matching
`ChatMessageUserInput`, a free-text user message that triggered the synthetic empty-answers row, or an assistant follow-up of any kind —
locks the form. Older collections render as static history (the answered or skipped summary).

There is no per-message "answered" flag. The check is a one-liner on the merged transcript: peek at the tail and see whether it is the
collection in question. The rule "fires" automatically the moment any newer row lands — no flag to flip, no race window between submit and
lock.

`chatInputCollectionRespond` enforces a server-side counterpart: if a `ChatMessageUserInput` already exists for the requested
`collectionMessageId`, it returns `null` without writing a second row or kicking off an assistant turn. Multi-tab races and any non-UI path
are handled there rather than relying on the client-side rule alone.

## Removed alternatives

### Manual tool execution in the approval respond command

An earlier iteration kept a shared tool registry (`src/server/agents/agentUserConversationTools.ts`, since deleted) that both the agent and
`chatToolApprovalRespond` consumed. On approve, the respond command itself looked up the registry entry, re-validated the persisted
`toolArgs` against the registry's `inputSchema`, called `execute` directly (outside any DB transaction so a slow tool wouldn't hold a lock),
and synthesized a `chatMessagesToolCall` row keyed to the original `toolCallId` — bumping that row's `createdAt` one millisecond past the
response so replay read `request → response → call → result`. Declines stored a synthetic `{ error: 'approval_declined', message }` payload
as the tool result. `toModelMessages` then skipped both approval rows entirely; only the synthesized tool-call row reached the LLM.

That worked, but every piece of it was a parallel re-implementation of what the AI SDK already does: `collectToolApprovals` runs the
approved tool's `execute` itself when it sees a `tool-approval-response` part, and emits an `execution-denied` tool-result for declines.
Keeping the manual path also forced the registry indirection (the agent and the respond command both needed `inputSchema` and `execute` off
the same value), the unknown-tool-name guard for cross-deploy schema drift, the schema re-validation, the synthetic decline payload, and the
`+1ms createdAt` ordering hack. The SDK-driven path collapses all of that to "persist the response row, kick off the next turn"; tools live
in their own files and are wired directly into the agent's `tools` map.

## Alternatives Considered

| Decision                                 | Alternative                                            | Why rejected                                                                                  |
| ---------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Union of concrete types                  | Single `ChatMessage` with many nullable fields         | Loses type safety; client must guard every field                                              |
| Union of concrete types                  | GraphQL interface                                      | Codegen unions already share common fields in TypeScript                                      |
| One type per input kind                  | Single input type + `ChatInputType` enum               | Date pickers carry empty `options`; selects carry an unused `mode`                            |
| Date kind by value cardinality           | Single `Date*Picker` type with `mode: SINGLE \| RANGE` | Response value shapes differ; per-kind options diverge over time                              |
| Label-only select options                | `[{ label, value }!]!`                                 | The LLM consumes natural language and maps it back to tool args itself                        |
| Collection of N inputs per assistant     | One input per assistant message                        | Forms-style turns balloon round-trips and chat noise                                          |
| Single `ChatMessageUserInput` response   | One `ChatMessageUser` per answered slot                | Pollutes the log with synthetic "user said Friday" turns the human didn't type                |
| Folded answer rendering in collection    | Standalone right-aligned `ChatMessageUserInput` bubble | Caused post-submit form reset and double-submit; the user clicked pickers, didn't type values |
| All-or-nothing submit                    | Per-field submit                                       | Forces partial server state; breaks append-only log                                           |
| Server-synthesized `skipped` userInput   | Lock composer until the open collection is answered    | Traps the user in a question they may want to abandon                                         |
| Server-synthesized `skipped` userInput   | Treat `MissingToolResultsError` as a retry signal      | The bug lives in the transcript shape; locking/retrying papers over it                        |
| Tool args via `JSON` scalar              | Per-tool GraphQL types in the schema                   | Tool args are per-tool-typed and only used by an inspect dialog                               |
| No tool-result message                   | `ChatMessageToolResult { output: JSON }`               | Result is for the LLM; rendering JSON in the UI duplicates work and leaks data                |
| Approvals separate from input collection | Fold approval into `ChatAssistantInput`                | Conflates a control-flow gate with a data-collection prompt                                   |
| SDK-driven approval execution            | Manual execute in `chatToolApprovalRespond`            | Duplicates what the AI SDK already does — see "Removed alternatives" above                    |
| Latest-collection-only (UI)              | Persist an `answeredAt` flag and disable historic ones | Adds a write per submit and a guard against double-submit                                     |

## Consequences

- Every chat surface reuses one `ChatMessage` union; a schema-builder assistant chat and a team-support direct chat both query
  `Chat { messages { __typename ... } }`.
- Resolvers follow CQRS: reads in `src/server/queries/`, writes in `src/server/commands/`, wired in `resolversCreate.ts`. The shared
  turn-runner is the only place that drives the assistant.
- DB persistence, AI SDK replay, and history loading are documented in [Chat Persistence](./chat-persistence.md). This doc does not
  re-derive them.
- New union members are an SDL change + a `gqlTypeName` augmentation in `src/server/graphql/extensions.ts` + a mapper + a render-side switch
  case. The `<ChatMessage />` switch becomes a TypeScript error if a member is forgotten.
- The eight assistant-input kinds are owned by a single registry (`src/web/chat/chatAssistantInputKinds.ts`) — slot kind → display icon +
  label, draft shape, draft-to-typed-value serializer, value-to-flat-input flattener, value-to-string formatter. Adding a ninth kind touches
  that file, the GraphQL schema, and the persistence promoter.
- Concrete chat surfaces (with their agent choice, allowed tools, layout, empty state, etc.) get their own `docs/features/{name}.md` and
  reference this doc as their foundation.

## Key Files

- `src/server/graphql/schema.graphqls` — `ChatMessage`, `ChatAssistantInput`, `ChatAssistantInputValue`, `ChatUpdate` unions
- `src/server/graphql/extensions.ts` — `gqlTypeName` augmentations and `__resolveType` wiring
- `src/server/commands/chatMessageAppend.ts` — the single "commit + publish" primitive
- `src/server/commands/chatAssistantTurnRun.ts` — shared turn-runner; `chatAssistantTurnRunDetached`
- `src/server/commands/chatMessageCreate.ts` — user send; ensures the chat row; synthesizes the skipped-userInput pivot row
- `src/server/commands/chatInputCollectionRespond.ts` — userInput submit; double-submit guard
- `src/server/commands/chatToolApprovalRespond.ts` — approval response writer (no `execute`)
- `src/server/agents/toolPromptUserForInput.ts` — the `execute`-less tool that produces input collections
- `src/server/mappers/toModelMessages.ts` — the only file that imports AI SDK content types
- `src/web/components/chat-message/` — one render file per `ChatMessage` variant + shared row primitives
- `src/web/chat/ChatTranscriptShared.tsx` — the shared transcript renderer used by every chat surface. See
  [`chat-transcript.md`](./chat-transcript.md).
- `src/web/chat/chatAssistantInputKinds.ts` — slot-kind registry
- `src/web/chat/useChatLiveUpdates.tsx` — per-turn live state, `<ChatUpdatesListener />`, `beginTurn()`
