# Chat Persistence

Companion to [Chat Foundation](./chat.md). That doc decides the shape of the GraphQL chat model; this one decides how those messages are
stored and how they are replayed back to the LLM.

## Context

The GraphQL `ChatMessage` union has 7+ concrete variants with genuinely different shapes — text bodies, keyed answer arrays, paired
approvals, multi-input collections. The same conversation also has to be replayed to the language model as an AI SDK `ModelMessage[]`, which
uses a different shape entirely (role + `UserContent | AssistantContent | ToolContent`).

Two source-of-truth options were on the table:

1. **Persist the AI-SDK shape.** Rows are `(role, content)`. Replaying the LLM is `SELECT * ORDER BY createdAt`. Projecting to the GraphQL
   union becomes a non-trivial unmarshal, and several UI variants (`AssistantInputCollection` with N typed slots, `UserInput` with keyed
   answers, the approval request/response pair) don't naturally fit AI SDK content types without inventing fake tool calls.
2. **Persist the UI shape.** Rows mirror the GraphQL union 1:1. Reading for the UI is direct. Replaying the LLM requires a mapper from
   stored rows to `ModelMessage[]`.

The UI shape is the richer, more opinionated model — the AI-SDK shape is mechanically derivable from it; the reverse requires invention.
This doc adopts the UI shape as the source of truth and confines AI SDK types to a single mapper.

## Decision

### UI-shaped source of truth: base table + per-variant tables

A spine table `ChatMessages` holds shared columns (id, chat membership, kind discriminator, author, createdAt). Each variant gets its own
table keyed by the same `chatMessageId`, carrying only its variant-specific columns.

```text
chats
  chatId, title, lastModifiedAt, createdAt

chatMessages                                          -- spine
  chatMessageId PK, chatId FK, kind, authorUserId?, createdAt

chatMessagesUser                                      -- 1:1 with spine row
  chatMessageId PK FK, body
chatMessagesAssistantText
  chatMessageId PK FK, body
chatMessagesToolCall
  chatMessageId PK FK, toolCallId, toolName, toolArgs jsonb,
  toolResult jsonb?, resultedAt timestamptz?
chatMessagesToolApprovalRequest
  chatMessageId PK FK, approvalId UNIQUE, toolName, toolArgs jsonb
chatMessagesToolApprovalResponse
  chatMessageId PK FK, approvalId FK → request, approved
chatMessagesAssistantInputCollection
  chatMessageId PK FK, prompt, inputs jsonb
chatMessagesUserInput
  chatMessageId PK FK, collectionMessageId FK → collection, answers jsonb
```

Why not a single wide `ChatMessages` table with a `kind` discriminator and many nullable columns:

- Half the columns would be NULL in any row. The schema has eight variants with genuinely different shapes.
- Two of those variants pair via FK (`UserInput.collectionMessageId → AssistantInputCollection.chatMessageId`,
  `ToolApprovalResponse.approvalId → ToolApprovalRequest.approvalId`). FKs into a JSONB blob are not enforceable.
- The variant set grows with the product. Adding a new union member already means an SDL change, a mapper, and a resolver wiring; one more
  table moves on the same cadence.

Why not pure JSONB for the variant payload:

- Loses the FKs above.
- Loses cheap per-variant indexes (e.g. partial index on `kind = 'assistantInputCollection'` to speed the latest-collection `findLast`).
- The `kind` column already gives every benefit of "discriminator-driven JSON" without giving up structure where structure exists.

### JSONB only where the GraphQL schema is itself a union of values

Three columns stay JSONB:

- `chatMessagesAssistantInputCollection.inputs` — `ChatAssistantInput` is a GraphQL union; there is no flat column shape for it.
- `chatMessagesUserInput.answers` — `ChatAssistantInputValue` is also a GraphQL union; same reasoning.
- `chatMessagesToolCall.toolArgs` and `.toolResult` — tool I/O is per-tool-typed and never queried by the database. Tool args are also
  duplicated on `chatMessagesToolApprovalRequest` because they need to be visible to the human approving the call.

These are the only places JSONB is the right answer. They are typed at the application boundary by Zod schemas before insertion, not at the
database level. The JSON shape is documented next to its schema, not in this doc.

### Date-scalar values are stored as `YYYY-MM-DD` strings

The `Date` GraphQL scalar (from `graphql-scalars`' `DateResolver`) parses incoming wire strings into JS `Date` objects at the resolver
boundary, regardless of the TS input type codegen declares. Persisting that `Date` directly into a `ChatAssistantInputValueDate` JSONB
payload would `JSON.stringify` it as a full ISO-8601 timestamp, which `DateResolver.serialize` later rejects on read with
`Date cannot represent an invalid date-string …`.

Two rules close that gap:

- **Lift before write.** `chatInputCollectionRespond` calls `dateToIsoDate` to coerce `Date`-kind answer fields back to `YYYY-MM-DD` before
  the JSONB insert.
- **Tolerate legacy rows.** `toGqlChatMessage` trims persisted `Date`-kind values that still look like a full ISO timestamp down to the date
  portion, so chats written before the lift still load.

`DateTime`-kind answers don't need the same handling — `DateTimeResolver` accepts and produces full ISO timestamps natively.

### Generation metadata is denormalized onto every AI-produced variant row

Each LLM step produces one or more persisted rows — one `chatMessagesAssistantText`, plus zero-to-many `chatMessagesToolCall`,
`chatMessagesToolApprovalRequest`, and `chatMessagesAssistantInputCollection` rows. The AI SDK reports a single `usage` snapshot
(`inputTokens`, `outputTokens`, `totalTokens`, optional `reasoningTokens`, `cachedInputTokens`) and a `model.modelId` per step. Those six
columns ride on every AI-produced variant table:

```text
chatMessagesAssistantText        + modelId, inputTokens, outputTokens, totalTokens, reasoningTokens, cachedInputTokens
chatMessagesToolCall             + modelId, inputTokens, outputTokens, totalTokens, reasoningTokens, cachedInputTokens
chatMessagesToolApprovalRequest  + modelId, inputTokens, outputTokens, totalTokens, reasoningTokens, cachedInputTokens
chatMessagesAssistantInputCollection + modelId, inputTokens, outputTokens, totalTokens, reasoningTokens, cachedInputTokens
```

All six are nullable. Pre-feature rows have no usage, providers omit fields they don't emit (Gemini reports `cachedInputTokens` but no
`reasoningTokens`; OpenAI is the inverse), and `totalTokens` falls back to `inputTokens + outputTokens` only when both are present —
otherwise it stays `null` rather than reporting a misleading zero.

`chatAssistantTurnRun` populates these columns. `onStepFinish` builds the snapshot once via `stepGenerationMeta(step)` and spreads it into
each variant insert payload that step produces (the toolCall, the approvalRequest, the assistantInputCollection branches). The streaming
`assistantText` row is written _after_ `onStepFinish` returns, so the runner caches the most recent step's snapshot in a
`lastStepGeneration` closure variable and spreads that into the assistant-text insert at end-of-stream. Rows written by other commands
(`chatToolApprovalRespond`, the synthetic skipped-userInput row) carry `null` for all six columns — they aren't the LLM's output.

**The trade-off: per-step duplication.** A step that emits text plus three tool calls writes the same `(modelId, *Tokens)` numbers to four
rows. A naïve `SUM(totalTokens)` over `chatMessagesToolCall` therefore over-counts. The denormalization was chosen anyway because:

- The dominant aggregation today is "show the model + token count next to _this_ assistant message", which is a row-local read with no join.
- Aggregations that need accuracy (per-chat / per-user / per-day totals) can dedupe by `(chatMessageId, step boundary)` or join through a
  future generations table without a schema migration of the message tables.
- A normalized "one row per step" table would force a join on the read path that's currently the fast happy path, for a feature whose
  primary consumer is per-row badging.

This is the inverse of the rule the rest of this doc applies (variant tables stay narrow). The exception is justified because these columns
are genuinely shared by every AI-produced variant — adding them to a parallel `ChatGenerationSteps` table would create the same six columns
plus a foreign key on every variant row, with no read-path benefit unless an analytics consumer materializes.

GraphQL surface: a single `ChatMessageGeneration` type, exposed as a nullable `generation: ChatMessageGeneration` field on each of the four
AI-produced variants. Mapped by `toGqlChatMessageGeneration` in `src/server/mappers/toGqlChatMessage.ts`, which returns `null` when
`modelId` is unset (legacy rows or rare provider responses without a model id).

### Tool results live on the tool-call row, not as a separate message

`docs/architecture/chat.md` rejects a `ChatMessageToolResult` GraphQL variant because results are for the LLM, not the UI. The DB mirrors
that: each tool call is one row in `chatMessagesToolCall` with two timestamps — `createdAt` (call started) and `resultedAt` (result
populated). `toolResult` is a private column never exposed via GraphQL.

The full result is stored, not a summary. Storage cost is bounded by the tool's own output, and "what did the LLM see at step N?" is exactly
the question replay needs to answer.

### One row per tool call, not per assistant turn

A single assistant turn can fan out into multiple tool calls. Each call gets its own `chatMessagesToolCall` row so the approval pair, the
LLM's tool-call id, and the result/timing all line up 1:1 with the `ChatMessageToolCall` GraphQL variant. Grouping by turn would force a
join to recover what the schema already represents per-call.

### `promptUserForInput` is the one tool call that doesn't become a tool-call row

The agent calls `promptUserForInput` to ask for structured values (see
[Chat Foundation](./chat.md#produced-by-the-promptuserforinput-tool)). At persistence time, `chatMessageCreate.onStepFinish` branches on
`call.toolName === 'promptUserForInput'` and writes a `chatMessagesAssistantInputCollection` row instead of the generic
`chatMessagesToolCall` row, generating a fresh `inputId` per slot. The agent loop is also configured to stop on this tool call — there is no
`execute`, so the next turn-taker is the user, not the LLM.

The round-trip is restored on read: `toModelMessages` replays the collection as a `promptUserForInput` tool-call and the matching
`ChatMessageUserInput` as the tool-result, so the LLM sees its own original turn shape on subsequent turns.

### Streaming assistant text is inserted at end-of-stream

While a `ChatMessageAssistantText` is streaming, chunks are published over the live subscription channel
(`generationChunkUpdates(generationId)`), not written to the row. The `chatMessagesAssistantText` row is inserted once when the stream
completes, with the final body. The row is the durable artifact; the subscription is the live wire.

This avoids row mutation per chunk (high write amplification) and keeps the message log append-only — every row, once written, is final. A
client that reconnects mid-stream sees no partial row in history; it sees the live subscription pick up where it left off.

### `chatMessageCreate` owns the "ensure chat" step

Per the schema, `chatId` on `chatMessageCreate` is optional — passing `null` means "start a new chat". The command inserts the `chats` row
in the same transaction as the first `ChatMessageUser` row. There is no separate `chatCreate` mutation.

### AI SDK types stay in one mapper

`UserContent | AssistantContent | ToolContent` from `ai` describe the LLM transport, not the UI. Importing them into `db/schema.ts` would
couple the persistence layer to a transport choice it doesn't make.

A new mapper `src/server/mappers/toModelMessages.ts` is the only file that imports those types. It joins the spine + variant rows for one
chat into a `ModelMessage[]` ready for `agent.stream({ messages })`. Joining rules:

- `chatMessagesUser.body` → `{ role: 'user', content: body }` when the message has no attachments. With attachments,
  `→ { role: 'user', content: [TextPart, ...ImagePart|FilePart] }` — image MIME types ride through `ImagePart`, everything else through
  `FilePart`. Bytes are inlined out of the JOINed `userAttachments` payload so the agent has everything it needs in memory without a second
  DB hop. See [Attachments](#attachments) below.
- `chatMessagesAssistantText.body` → `{ role: 'assistant', content: body }`.
- `chatMessagesToolCall (toolCallId, toolName, toolArgs)` → an assistant message with a tool-call part.
- `chatMessagesToolCall (toolCallId, toolResult)` once `resultedAt` is set → a `tool` message with a tool-result part using the same
  `toolCallId`.
- `chatMessagesAssistantInputCollection` paired with the next `chatMessagesUserInput` → a synthetic tool round-trip for the
  `promptUserForInput` tool, mirroring how the agent originally produced the collection.
- `chatMessagesToolApprovalRequest` / `chatMessagesToolApprovalResponse` are control-flow rows; they do not map to model messages. The agent
  loop reads them directly to decide whether to execute a pending call. When the human approves (or declines), `chatToolApprovalRespond`
  writes a regular `chatMessagesToolCall` row keyed to the request's `toolCallId` — `toModelMessages`' existing `toolCall` branch then emits
  the `tool-call` + `tool-result` ModelMessage pair. No new transport for resume; the approval pair is purely UI control-flow.

This mirrors the GraphQL boundary: `db/schema.ts` knows nothing about GraphQL types, mappers translate. The same convention now applies to
AI SDK types.

### History replay is one shared loader

Every command that kicks off an assistant turn — `chatMessageCreate`, `chatInputCollectionRespond`, `chatToolApprovalRespond` — needs the
prior conversation as `ModelMessage[]` before the agent steps. They share one path: load the joined spine + variant rows for the chat via
`chatMessageRowsLoad` (the same loader the read path uses), then run the rows through `toModelMessages`.

`chatAssistantTurnRunDetached` performs that load + replay itself, inside the detached IIFE — the three commands each call it as a one-line
"user-side row is durable; now run the agent" handoff. Re-reading after the command's own writes is the point: command-side side-effects
(e.g. the synthetic skipped-userInput row that `chatMessageCreate` writes when the user pivots away from a form) get picked up by the
re-read, not by hand-building a `ChatMessageRowJoined` mirror inside the command. Load failures route to `serverRuntime.log` like any other
turn error.

### Attachments

A `ChatMessageUser` carries zero or more files. Chat does not own a blob table of its own — bytes live in the template-wide
[FileUploads store](./file-storage.md) (a `bytea` column on a regular table, consumer-agnostic). What's chat-specific is the join shape and
the read path: a `ChatMessageUserAttachments` row binds a user message to one or more `FileUploads` rows in send-order, and the read path
bulk-loads them onto the joined row payload. An HTTP-route-side 10 MB-per-file cap (enforced at `/api/file-uploads`) bounds the per-file
cost.

```text
FileUploads                                                  -- generic store; see file-storage.md
  fileUploadId PK, userId FK → users, filename, mediaType, size, bytes bytea, createdAt

ChatMessageUserAttachments                                   -- chat's view: files attached to a user message, send-order
  chatMessageId FK → chatMessagesUser, fileUploadId FK → fileUploads, position int
  UNIQUE (chatMessageId, fileUploadId)
```

Why a separate join row instead of a `chatMessageId FK` on `FileUploads`:

- The bytes are owned by the user, not the chat — the same `FileUploads` row could in principle be referenced from more than one user
  message (today we don't dedupe — a paste-twice produces two rows — but the schema doesn't forbid sharing) and from non-chat consumers too.
  Tying the upload row to one message would foreclose both.
- The bytes survive a chat-message delete in any future model where chat retention diverges from upload retention. Today both cascade the
  same way, but the join row is the cheap layer that lets either policy change without a column move.
- Writes are still atomic with the user message: `chatMessageCreate` writes the `ChatMessagesUser` row and the join rows in the same
  transaction (`chatMessageAppend`'s `insertVariant` callback), so subscribers never see a half-attached message.

Reads on the chat path bulk-load attachments via a single `IN` query keyed by the user-message ids in the result set
(`attachUserAttachments` in `src/server/queries/chatMessageRowsLoad.ts`) — joining `ChatMessageUserAttachments` onto `FileUploads` and
bucketing the results back onto `ChatMessageRowJoined.userAttachments`. Folding into the main LEFT JOIN would multiply user rows by their
attachment count and force a `GROUP BY` / `array_agg` shuffle for an N-row table that's already small per chat.

Reads for the LLM use the same payload — `toModelMessages` reads `row.userAttachments` straight off the joined row and inlines bytes into
`ImagePart` / `FilePart` (the dispatcher `toModelMessagePartForFileUpload` decides by `mediaType`). No second query, no second mapper.

## Alternatives Considered

| Decision                                            | Alternative                                                 | Why rejected                                                                                                                                            |
| --------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI-shaped source of truth                           | Persist `ModelMessage[]` and project to GraphQL on read     | UI variants don't fit AI SDK content; requires inventing fake tool calls                                                                                |
| Base + per-variant tables                           | Single wide `ChatMessages` table with nullable columns      | Half the columns NULL per row; no FKs across variant pairings                                                                                           |
| Base + per-variant tables                           | Single table with a JSONB `payload` column                  | Loses FKs and partial indexes; `kind` already discriminates without JSON                                                                                |
| JSONB only for `inputs`/`answers`/`toolArgs+Result` | Materialize input slots and answers into rows               | Slot/value types are themselves GraphQL unions — no flat row shape exists                                                                               |
| Tool result on the call row                         | Separate `chatMessagesToolResult` table                     | Result is 1:1 with the call and never queried independently                                                                                             |
| One row per tool call                               | One row per assistant turn with an array of calls           | Misaligned with the GraphQL `ChatMessageToolCall` variant                                                                                               |
| Insert assistant text on stream end                 | Insert empty row, append chunks via UPDATE                  | High write amplification; breaks append-only log                                                                                                        |
| `chatMessageCreate` ensures the chat                | Separate `chatCreate` mutation                              | Forces a round-trip the schema deliberately collapses (`chatId: ID`)                                                                                    |
| AI SDK types in mapper only                         | Import `UserContent`/`AssistantContent` into `db/schema.ts` | Couples persistence to LLM transport                                                                                                                    |
| Per-row usage columns on AI variants                | One `ChatGenerationSteps` table FK'd from spine             | Forces a join on the per-row read path for a feature today only used for badging; per-step duplication is tolerable for analytics consumers that dedupe |

## Consequences

- **Reading for the UI** is `chatId → spine rows ordered by createdAt → LEFT JOIN per-variant tables → group by date`. The
  `chatMessageGroupsFindMany` query (or equivalent) is the only place that knows the join shape.
- **Replaying for the LLM** is `chatId → spine rows + variant rows → toModelMessages → ModelMessage[]`. Tool-call and tool-result rows pair
  via `toolCallId`; collection + user-input rows pair via `collectionMessageId`.
- **Assistant-turn persistence is shared.** Both `chatMessageCreate` (initial user turn) and `chatInputCollectionRespond` (user-input
  answer) call `src/server/commands/chatAssistantTurnRun.ts`, which builds the agent, persists each tool call as it lands (with the
  `promptUserForInput` branch that becomes an `assistantInputCollection` row), streams to the `generationChunkUpdates` channel, and writes
  the `assistantText` row at end-of-stream. Adding new entry-points (e.g. tool-approval respond) means calling the same helper, not
  duplicating the streaming logic.
- **New variants** mean: SDL union member, mapper, command, plus one new per-variant table. The shape of that table is the same as the
  variant's GraphQL fields minus `chatMessageId` and `createdAt` (which live on the spine).
- **Migrations** are generated by `npm run db:generate`; this set of tables ships as one migration. Renames or column-shape changes go
  through Drizzle's normal migration flow — no special path.
- **Indexes** that ship with the initial migration: `(chatId, createdAt)` on the spine for ordered reads, partial index on
  `kind = 'assistantInputCollection'` for the `findLast` interactive-collection check, unique on `approvalId` for the request table.
