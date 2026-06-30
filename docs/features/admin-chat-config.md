# Admin chat config

The workspace personal-assistant composer at `/workspace/assistant` exposes a model-selection dropdown so the admin (Cem) can pick which
Gemini model answers the next turn. The picked model is **sticky**: changing the dropdown both selects for the current send AND persists as
the new saved default. Future chats open with whatever was last picked.

See also:

- [features/chat-workspace.md](./chat-workspace.md) — the workspace chat surface itself.
- [architecture/multi-agent-chat.md](../architecture/multi-agent-chat.md) — how visitor and admin chats split, and how the picked `modelId`
  flows through `ChatAssistantOptions` into the agent factory.

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

| Entry point                                                        | Behavior                                                                                                                                                                                              |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace `/workspace/assistant` composer                          | Renders the model dropdown in the bottom-addon row alongside the Auto/Manual approval-mode selector. Picking a new model updates the local state AND fires `chatConfigDefaultModelSet` to persist it. |
| Workspace assistant sheet (`WorkspaceAssistantChatSheet`) — future | Not wired yet; the sheet currently inherits whatever the route last persisted via the saved default.                                                                                                  |
| Public visitor sheet (`/`, "Ask me anything")                      | **No dropdown.** The visitor surface stays on the catalog fallback (`gemini-2.5-flash`); admin-only feature.                                                                                          |

## Model catalog

The catalog lives in code at `src/server/agents/adminChatModels.ts`. Each entry is `{ modelId, label, supportedMediaTypes }`:

| `modelId`                | Label                    | Supported attachment types                                                 |
| ------------------------ | ------------------------ | -------------------------------------------------------------------------- |
| `gemini-2.5-flash`       | Gemini 2.5 Flash         | Images (png/jpeg/webp/heic/heif), PDF, plain text, markdown, csv           |
| `gemini-2.5-pro`         | Gemini 2.5 Pro           | Flash list **plus** Word (.doc/.docx), Excel (.xls/.xlsx), JSON, XML, HTML |
| `gemini-3.5-flash`       | Gemini 3.5 Flash         | Same as Flash 2.5                                                          |
| `gemini-3.1-pro-preview` | Gemini 3.1 Pro (preview) | Same as Pro 2.5                                                            |

Why code, not DB: adding or removing a model is a code change anyway — the provider needs to know the id is valid, the supported-media-type
list is a deployment-time fact, and shipping the catalog as a typed const keeps the resolver and the validator pointing at the same source.
The DB only stores **which one is currently picked**, not the list itself.

## Storage

Singleton row, same shape as `Profile`:

```sql
CREATE TABLE "AdminChatConfig" (
    "adminChatConfigId" uuid PRIMARY KEY,
    "defaultModelId" varchar NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
```

Fixed id (`00000000-0000-0000-0000-000000000002`) in `src/server/agents/adminChatConfig.ts`. The row is bootstrapped lazily on first
`Admin.chatConfig` read (`src/server/queries/adminChatConfigGet.ts`) — until then, the runtime falls back to the catalog's first entry
(`gemini-2.5-flash`). Phase 2 (per-user accounts) keeps this id for "the owner's config" and adds a per-user split as a column addition, not
a schema move.

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
            │ resolved = assistantOptions.modelId ?? adminChatConfigGet().defaultModelId
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
type is shared with the admin mutation), but the visitor agent (`agentVisitorAboutCem`) never reads it — it calls
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
| Singleton read + bootstrap              | `src/server/queries/adminChatConfigGet.ts`                                                        |
| Default-model writer                    | `src/server/commands/adminChatConfigDefaultModelSet.ts`                                           |
| Runtime model factory                   | `src/server/domain/serverRuntimeCreate.ts` (`ai.userConversationModel`)                           |
| Agent wire-in                           | `src/server/agents/agentPersonalAssistant.ts`                                                     |
| GraphQL schema                          | `src/server/graphql/schema.graphqls` (`AdminChatModel`, `AdminChatConfig`, mutation, input field) |
| Resolvers                               | `src/server/graphql/resolversCreate.ts`                                                           |
| Client ops                              | `src/routes/{-$locale}/workspace/WorkspaceAssistantPage.graphql`                                  |
| Composer (admin wrapper)                | `src/web/chat/WorkspaceChatComposer.tsx`                                                          |
| Composer (generic)                      | `src/web/chat/ChatComposer.tsx`                                                                   |
| Composer primitive (accept passthrough) | `src/web/components/MessageComposer.tsx`                                                          |
| Layout loader (config fetch)            | `src/routes/{-$locale}/workspace.tsx`                                                             |
| Provider (model selection state)        | `src/web/chat/WorkspaceAssistantChatProvider.tsx`                                                 |
