# Admin chat config

The workspace personal-assistant composer at `/workspace/assistant` exposes a model-selection dropdown so the admin can pick which Gemini
model answers the next turn. The picked model is **sticky**: changing the dropdown both selects for the current send AND persists as the new
saved default. Future chats open with whatever was last picked.

See also:

- [features/chat-workspace.md](./chat-workspace.md) — the workspace chat surface itself (agent dispatch, model picker host).
- [architecture/chat.md](../architecture/chat.md) — shared chat model; how admin sends plug in via `scope: 'admin'`.

## Why this exists

Two problems with a single hardcoded `gemini-2.5-flash`:

1. **File-type support varies by model.** Flash 2.5 won't take a `.docx` inline; Pro tiers will. With a single fixed model, attempting to
   attach an unsupported file surfaces as an upstream model error after upload, not as a "this file isn't supported" gate at the picker.
2. **No way to pick the right tier for the job.** Routine chat is cheap on Flash; reasoning about a long document benefits from Pro. The
   admin should be able to choose without a redeploy.

The fix: a catalog of available models, each with a list of `supportedMediaTypes`. The composer drives the file picker's `accept` filter
from the active model — `.docx` is pick-able iff the model says so. The picked id rides on each `chatMessageCreate` mutation through
`ChatAssistantOptions.modelId`; the agent factory uses it; the runtime validates it against the catalog and fails fast on unknown ids.

## Surfaces

The model dropdown ships on **every** admin composer via `WorkspaceAssistantChatProvider` (layout-mounted) → `WorkspaceChatComposer`.
Picking a new model updates local state and fires `chatConfigDefaultModelSet` to persist the sticky default.

| Entry point                                                   | Behavior                                                                                                                             |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Workspace hub composer (`/workspace`)                         | Same `<WorkspaceChatComposer />`; model dropdown + Auto/Manual approval-mode selector + context-window ring in the bottom-addon row. |
| Workspace assistant sidebar (`WorkspaceAssistantChatSidebar`) | Wired — sidebar body uses `<WorkspaceChatComposer />` under the shared provider; same dropdown + ring as hub / deep-link.            |
| Workspace deep-link (`/workspace/assistant/$chatId`)          | Same `<WorkspaceChatComposer />` + provider; dropdown + ring always present.                                                         |
| Public visitor sheet (`/`, "Ask me anything")                 | **No dropdown / no context ring.** The visitor surface stays on the catalog fallback (`gemini-2.5-flash`); admin-only feature.       |

## Model catalog

The catalog lives in code at `src/server/agents/adminChatModels.ts`. Each entry is
`{ modelId, label, supportedMediaTypes, contextWindowTokens }`:

| `modelId`                | Label                    | Context window | Supported attachment types                                                 |
| ------------------------ | ------------------------ | -------------- | -------------------------------------------------------------------------- |
| `gemini-2.5-flash`       | Gemini 2.5 Flash         | 1,048,576      | Images (png/jpeg/webp/heic/heif), PDF, plain text, markdown, csv           |
| `gemini-3.6-flash`       | Gemini 3.6 Flash         | 1,048,576      | Same as Flash 2.5 (runs with `thinkingLevel: high` + thought summaries)    |
| `gemini-3.1-pro-preview` | Gemini 3.1 Pro (preview) | 1,048,576      | Flash list **plus** Word (.doc/.docx), Excel (.xls/.xlsx), JSON, XML, HTML |

`contextWindowTokens` is the provider's max **input** tokens for one request (from the model card). The workspace composer shows a compact
usage **ring** (full = 100% used); hover expands to exact used / window / remaining counts. The ring turns destructive at ≥ 85% full.

**Where “used” comes from.** Authoritative value is `Chat.contextTokensUsed` — denormalized onto the `Chats` row at the end of each
assistant turn (same write that bumps `lastModifiedAt`), from the turn's last LLM step `inputTokens`. Reading it is O(1); no message-table
scan on composer render. The client may overlay a fresher number from live `generation.inputTokens` on the open transcript while a turn
streams in. Fresh chats and legacy rows with no usage yet read as empty (0 on the ring) until the first turn with metadata completes.

Why code, not DB for the catalog: adding or removing a model is a code change anyway — the provider needs to know the id is valid, the
supported-media-type list and context window are deployment-time facts, and shipping the catalog as a typed const keeps the resolver and the
validator pointing at the same source. The DB stores **which model is currently picked** (`AdminChatConfig.defaultModelId`) and **how full
the open chat's prompt is** (`Chats.contextTokensUsed`), not the catalog itself.

## Storage

Singleton row, same shape as `Compass`:

```sql
CREATE TABLE "AdminChatConfig" (
    "adminChatConfigId" uuid PRIMARY KEY,
    "defaultModelId" varchar NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
```

Fixed id (`00000000-0000-0000-0000-000000000002`) in `src/server/agents/adminChatConfig.ts`. The row is bootstrapped lazily on first
`Admin.adminChatConfigFindOne` read (`src/server/queries/adminChatConfigFindOne.ts`) — until then, the runtime falls back to the catalog's
first entry (`gemini-2.5-flash`). Phase 2 (per-user accounts) keeps this id for "the owner's config" and adds a per-user split as a column
addition, not a schema move.

## Data flow

```
   admin composer (dropdown)
            │ onModelChange(modelId)
            ▼
   useWorkspaceModelSelection
            │ — local state update (instant)
            │ — WorkspaceChatConfigDefaultModelSet mutation (fire-and-forget)
            ▼
   adminChatConfigDefaultModelSet command
            │ validates against catalog, UPDATEs row, bumps updatedAt
            ▼
   AdminChatConfig.defaultModelId

   admin composer (send)
            │ chatMessageCreate(assistantOptions.modelId = selectedModelId)
            ▼
   AdminMutation.chatMessageCreate resolver
            │ forwards assistantOptions verbatim
            ▼
   chatAssistantTurnRunDetached → agentPersonalAssistant
            │ resolved = assistantOptions.modelId ?? adminChatConfigFindOne().defaultModelId
            ▼
   serverRuntime.ai.userConversationModel(resolved)
            │ catalog-validates; throws on unknown id
            ▼
   google(resolved)  →  Gemini
```

The runtime catalog check is the firewall: even if a client sends `modelId: "gpt-5"` or anything outside the catalog, the agent build throws
before talking to the provider. Errors surface as a transport failure on the mutation and the composer restores the draft. (The catalog ids
are also validated at the mutation `chatConfigDefaultModelSet` write site, so a stale default can't be persisted either.)

## Visitor firewall

The visitor mutation (`Mutation.chatMessageCreate`, public scope) also accepts `assistantOptions.modelId` at the GraphQL level (the input
type is shared with the admin mutation), but the visitor agent (`agentVisitor`) never reads it — it calls
`serverRuntime.ai.userConversationModel()` with no argument, getting the catalog fallback. A visitor smuggling a `modelId` therefore has
zero effect; the field is admin-only by code, not just by schema.

## Future work

- **Per-chat sticky** instead of (or in addition to) global default. Today the dropdown's value is global to the admin user — switching
  models in one chat changes the saved default that the next chat opens with. A per-chat override would let the admin pick "Pro for this
  thread, Flash everywhere else."
- **Show available media types in the dropdown.** The composer's paperclip tooltip already lists the types ("Attach (PDF, Word, images)"),
  but the dropdown itself doesn't surface what each option supports.
- **Catalog growth.** Adding a 3.5 Pro Long variant or non-Gemini provider is a single edit to `adminChatModels.ts` plus (if it's a new
  provider) a new binding on `serverRuntime.ai`.

## Files

| Concern                                 | File                                                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Catalog (server-static)                 | `src/server/agents/adminChatModels.ts`                                                            |
| Singleton key                           | `src/server/agents/adminChatConfig.ts`                                                            |
| DB table                                | `src/server/db/schema.ts` (`adminChatConfig`)                                                     |
| Singleton read + bootstrap              | `src/server/queries/adminChatConfigFindOne.ts`                                                    |
| Default-model writer                    | `src/server/commands/adminChatConfigDefaultModelSet.ts`                                           |
| Runtime model factory                   | `src/server/domain/serverRuntimeCreate.ts` (`ai.userConversationModel`)                           |
| Agent wire-in                           | `src/server/agents/agentPersonalAssistant.ts`                                                     |
| GraphQL schema                          | `src/server/graphql/schema.graphqls` (`AdminChatModel`, `AdminChatConfig`, mutation, input field) |
| Resolvers                               | `src/server/graphql/resolversCreate.ts`                                                           |
| Client ops                              | `src/routes/{-$locale}/workspace/WorkspaceAssistantPage.graphql`                                  |
| Composer (admin wrapper)                | `src/web/chat/WorkspaceChatComposer.tsx`                                                          |
| Context-window helpers                  | `src/web/chat/chatContextUsage.ts`                                                                |
| Composer (generic)                      | `src/web/chat/ChatComposer.tsx`                                                                   |
| Composer primitive (accept passthrough) | `src/web/components/MessageComposer.tsx`                                                          |
| Layout loader (config fetch)            | `src/routes/{-$locale}/workspace.tsx`                                                             |
| Provider (model selection state)        | `src/web/chat/WorkspaceAssistantChatProvider.tsx`                                                 |
