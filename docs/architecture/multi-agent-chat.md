# Multi-Agent Chat

The site has two AI surfaces:

1. **Public visitor chat** — anonymous-or-cookie-session visitors. Answers questions about Cem and his work. Lives in a right-side `Sheet`
   opened from the landing page's Assistant section (`src/web/chat/WebsiteVisitorAssistantChatSheet.tsx`).
2. **Personal assistant at `/workspace/assistant`** — Cem's own assistant, behind GitHub OAuth. Eventually has tools that touch the database
   (calendar, notes, project content) — tools the visitor chat must NEVER reach.

They share the same persistence layer (`chats` + `chatMessages*`), the same streaming infrastructure (graphql-sse + PostgreSQL
NOTIFY/LISTEN), and the same UI primitives. They differ in **agent definition** (system prompt, tool surface, model bindings) and in
**authorization**.

## Decision

**Two parallel mutation namespaces.** Visitor mutations live on the top-level `Mutation` type and are guarded by the cookie session.
Workspace mutations live on a new `AdminMutation` type, gated by `guardAdminMutation`. The agent factory used for an assistant turn is
decided **implicitly by the access path** — the visitor namespace dispatches to `agentVisitorAboutCem`, the admin namespace dispatches to
`agentPersonalAssistant`. There is no enum field at the call boundary deciding which agent runs.

**One scope discriminator on `chats`.** Each chat row carries `scope: 'public' | 'admin'`, stamped by the command that created it. The
discriminator's job is post-hoc: enforce that a `chatId` flowing through a public mutation only resolves a `public` chat (and vice versa)
and split admin reads into the two list queries. It is NOT consulted to pick an agent — the namespace already did that.

**`Admin` query type for chat reads.** A new `Admin` namespace exposes:

- `publicChats: [Chat!]!` — visitor chats in `lastModifiedAt DESC` order.
- `publicChat(chatId: ID!): Chat!` — a single visitor chat (rejects `admin` scope).
- `chats: [Chat!]!` — admin chats.
- `chat(chatId: ID!): Chat!` — a single admin chat (rejects `public` scope).

`Session.chat(chatId)` is removed. Visitors reading their own chat go through `Query.chat` (resolves any `public` chat by id — Phase 1 keeps
the unguessable-id model the live subscription already uses; per-user ownership lands when accounts do). Admins read through
`Query.admin.chat(chatId)` / `Query.admin.publicChat(chatId)`.

### Schema shape

```graphql
type Query {
    currentSession: Session!
    chat(chatId: ID!): Chat! # public-scope chats only
    admin: Admin! # gated by guardAdmin
}

type Admin {
    publicChats: [Chat!]!
    publicChat(chatId: ID!): Chat!
    chats: [Chat!]!
    chat(chatId: ID!): Chat!
}

type Mutation {
    userCreate(user: UserCreate!): MutationResult!
    user: UserMutation!
    # Visitor chat mutations — public scope; cookie session authenticated.
    chatMessageCreate(...): ChatMessageCreateResult
    chatInputCollectionRespond(...): ChatMessageCreateResult
    chatToolApprovalRespond(...): ChatMessageCreateResult
    admin: AdminMutation! # gated by guardAdminMutation
}

type AdminMutation {
    chatMessageCreate(...): ChatMessageCreateResult
    chatInputCollectionRespond(...): ChatMessageCreateResult
    chatToolApprovalRespond(...): ChatMessageCreateResult
}
```

The `UserMutation` namespace keeps its non-chat fields (`userUpdate`, `terminateSessions`); the three chat mutations move out of it. Chat
sending is a per-session capability, not a per-user one — the public visitor doesn't need to be a registered user to send.

### Schema change (db)

```typescript
// src/server/db/schema.ts
export const chats = pgTable('Chats', {
  chatId: uuid().primaryKey(),
  title: varchar().notNull().default(''),
  // 'public' for visitor chats from the landing-page sheet; 'admin' for the
  // personal assistant at /workspace/assistant. Stamped by the creating
  // mutation; never updated.
  scope: varchar().$type<'public' | 'admin'>().notNull().default('public'),
  // Owning visitor session for public-scope chats — stamped on insert,
  // ON DELETE SET NULL. Admin chats leave this null (they belong to the
  // logged-in user, not the session). Powers Session.visitorChats and the
  // visitor-chat rate limiter — see docs/features/chat-visitor.md.
  sessionId: uuid(),
  lastModifiedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});
```

Existing rows get `'public'` by the column default — Phase 1 only ever wrote visitor chats, so the backfill is correct.

### Agent factories

Replace `agentUserConversation.ts` with two siblings:

- `src/server/agents/agentVisitorAboutCem.ts` — visitor system prompt, three transactional tools (`sendEmailToCem`, `submitProjectRequest`,
  `verifyProjectRequestOtp`) plus `promptUserForInput`. The tools have `execute` functions whose return values land in
  `chatMessagesToolCall.toolResult` via the existing runner branch — no approval gating because the side effects are bounded by the existing
  visitor rate-limit + OTP firewall. See [features/chat-email-tools.md](../features/chat-email-tools.md).
- `src/server/agents/agentPersonalAssistant.ts` — personal-assistant system prompt, real tools (e.g. `toolNoteCreate`,
  `toolCalendarEventCreate`), all gated by `needsApproval` per the existing approval lifecycle. Also registers Gemini's provider-executed
  `googleSearch` grounding tool — see [features/chat-web-search.md](../features/chat-web-search.md). The visitor agent does not get search;
  capability asymmetry is the whole point of splitting the agents.

Shared scaffolding (provider bindings, a `currentDateForAgent()` line every system prompt embeds so Gemini doesn't anchor on its training
cutoff, `stopWhen` rules, the `onStepEnd` plumbing) lives in a tiny helper, not a base class — each agent file is self-contained enough to
skim. Provider options are a function (`googleAgentProviderOptionsFor(modelId)`) rather than a constant: Flash models get
`thinkingConfig.thinkingBudget: 0` to avoid Gemini's `MALFORMED_FUNCTION_CALL` quirk, but Pro models reject `0` with
`"Budget 0 is invalid. This model only works in thinking mode."` — so Pro keeps the default thinking budget while Flash forces it off. Each
agent resolves the model id once and passes it to both `serverRuntime.ai.userConversationModel(modelId)` and
`googleAgentProviderOptionsFor(modelId)` so the two stay in lockstep.

Both factories destructure the same `AgentChatOptions` shape, which now includes a `currentPagePath: string | null` field carrying the route
the user's browser was on when they hit Send. The visitor's `chatMessageCreate` and the admin's `admin.chatMessageCreate` both accept an
optional `currentPagePath: String` argument; the command forwards it through `chatAssistantTurnRunDetached` into the factory, and each
factory's `buildSystemPrompt` inlines a short page-context block when the value is present. The path is **not persisted** — it's a per-turn
signal that lets the agent anchor "tell me more" / "what am I looking at" against the visible surface (visitor) or disambiguate short
references against the encoded route (admin: `/workspace/projects/<projectId>`). See [features/chat-visitor.md](../features/chat-visitor.md)
and [features/chat-workspace.md](../features/chat-workspace.md) for the per-surface plumbing. `chatInputCollectionRespond` and
`chatToolApprovalRespond` pass `null` — they resume an already-mounted turn, so there's no fresh page to anchor.

### Dispatch

The two mutation namespaces wire the agent factory directly into the chat command:

```typescript
// resolversCreate.ts
Mutation: {
    chatMessageCreate(_, args, session) {
        return chatMessageCreate(args, session, serverRuntime, {
            scope: 'public',
            agentFactory: agentVisitorAboutCem,
        });
    },
    // …
},
AdminMutation: {
    chatMessageCreate(_, args, session) {
        return chatMessageCreate(args, session, serverRuntime, {
            scope: 'admin',
            agentFactory: agentPersonalAssistant,
        });
    },
    // …
},
```

`chatAssistantTurnRunDetached` accepts the agent factory as an option and threads it through to the runner — no other branch on `scope`
inside the runner. The command stamps the chat row's `scope` on insert (for new chats) and verifies it (for existing chats) so a stolen
`chatId` can't slip across the boundary.

### Authorization

- `Mutation.chatMessageCreate` / `chatInputCollectionRespond` / `chatToolApprovalRespond` → resolved chat must have `scope = 'public'`.
  Mismatch returns null (logged).
- `Mutation.admin` → `guardAdminMutation(session, serverRuntime)`. Checks `isAdmin` on the requesting session's `Users` row; throws
  `Unauthorized` if the session has no `userId` or the row is missing/non-admin. The flag is set manually in the DB for Cem's own accounts.
  Once OAuth lands, the same flag can be reconciled from `WORKSPACE_GITHUB_LOGINS` at login time. See
  [workspace-access.md](./workspace-access.md).
- `AdminMutation.*` → resolved chat must have `scope = 'admin'`. The `guardAdminMutation` gate at the `admin` field already keeps
  unauthenticated callers out of the namespace; the per-mutation scope check stops a logged-in admin from accidentally posting into a
  visitor chat by chatId.
- `Query.admin` → `guardAdmin(session, serverRuntime)`, the read-side counterpart with the same `isAdmin` check. Split from
  `guardAdminMutation` so write-side policy can diverge (e.g. CSRF, narrower allowlist) without dragging the read path along.
- `Query.chat(chatId)` → resolved chat must have `scope = 'public'`.

### Routing

- **Visitor chat sheet** — hosted on the landing page (`/`) inside `<WebsiteVisitorAssistantChatSheet />`. Always creates new chats with
  `scope = 'public'`. Sends through `Mutation.chatMessageCreate` (visitor namespace).
- `/workspace` — workspace hub. Hosts the assistant composer as the page hero. Sends through `Mutation.admin.chatMessageCreate` and
  navigates to `/workspace/assistant?chatId=<new id>` on first send.
- `/workspace/assistant` — loaded personal-assistant chat. Reads `Query.admin.chat(chatId)` and sends follow-up messages through the
  `AdminMutation.*` namespace. Always creates new chats with `scope = 'admin'`.

## Alternatives Considered

- **`agentKind` enum on `chats` driving dispatch.** The earlier draft of this doc. Rejected: the access path is the authoritative signal —
  the route the request came in through already knows which agent to run, and adding an enum at the call boundary just gives the client a
  way to spoof the wrong agent. The `scope` column survives in a narrower role (post-hoc auth check + read split), not as a dispatch input.
- **Two completely separate code paths** (separate tables, separate resolvers). Rejected: the chat-message persistence model is intricate
  enough that maintaining two copies would diverge fast. The split happens at the GraphQL namespace and the agent factory, not at the
  persistence layer.
- **A full agent registry** (lookup by string id). Overkill for two agents. Promote to a registry if/when a third lands.
- **Keep chat mutations on `UserMutation`.** Rejected: visitor chats don't need a registered user (cookie session is enough), and splitting
  them out lets the visitor namespace stay on top-level `Mutation` while the personal-assistant namespace is gated cleanly.

## Consequences

- One drizzle migration adds the `scope` column with default `'public'`.
- `chatMessageCreate` accepts a `{ scope, agentFactory }` option object (defaults match neither — the resolver always passes both). New
  chats stamp `scope`; existing chats are verified to match.
- The three chat mutations move from `UserMutation` to `Mutation` (visitor) and are mirrored on `AdminMutation` (admin). Client `.graphql`
  operations drop the `user { … }` wrapper.
- `Session.chat(chatId)` is removed. `Query.chat(chatId)` replaces it for visitor reads; `Query.admin.chat(chatId)` / `publicChat(chatId)`
  for admin reads.
- `agentUserConversation.ts` is renamed to `agentVisitorAboutCem.ts`. `agentPersonalAssistant.ts` lands as a Phase-2-stub sibling with the
  workspace system prompt.
- The chat-related architecture docs (`chat.md`, `chat-persistence.md`) keep their links to this doc; the dispatch model described here
  supersedes the older `agentKind`-driven sketch.

## Sub-agent delegation

The personal-assistant agent is itself a router: it owns the user-facing turn but delegates domain work (projects/tasks today, future
calendar/notes/fitness/finances/medical/media) to focused sub-agents via per-domain `delegateTo<Domain>` tools whose `execute` runs the
sub-agent in-process. The first sub-agent built on the pattern is `agentPersonalAssistantProjects`.

See [agent-delegation.md](./agent-delegation.md) for the full pattern — the sub-agent contract, the mutation-log return shape, the
`needsMoreInfo` / `noOp` sentinels, and the alternatives considered.

## Profile injection (Phase 2 onwards)

The personal assistant additionally reads a short synthesized summary on each turn and prepends it to its instructions. The summary is one
of three artifacts produced by an out-of-loop profiler that watches admin chat messages — see
[`docs/features/profile.md`](../features/profile.md).

- **Read path**: `agentPersonalAssistant` calls `profileSummaryGet(serverRuntime)` once per turn and prepends the returned text to its
  system prompt. That is the only profile data that crosses back into a prompt.
- **Write path**: `chatMessageCreate` on the admin namespace enqueues a `profileAnalyze` background job after the assistant turn fires. The
  job records observations and may auto-trigger a synthesis. The visitor agent never enqueues this job.
- **Firewall**: `profileSummaryGet` reads exactly one column (`Profile.summary`). The richer `prose` and `psychProfile` fields are surfaced
  only at `/workspace/profile` and never reach any agent. Storage separation, not prompt hygiene, is what enforces the boundary.

## Per-turn model selection (admin only)

The admin composer surfaces a dropdown of available chat models; the picked id rides on each mutation through
`ChatAssistantOptions.modelId`. The admin agent factory reads it, falls back to the persisted default (`AdminChatConfig.defaultModelId`),
and asks the runtime for a `LanguageModel`. The runtime catalog-validates the id and throws on anything outside the catalog.

- **Catalog**: `src/server/agents/adminChatModels.ts` lists the four available Gemini models with their per-model `supportedMediaTypes`.
  Adding a model is a single edit there.
- **Wire**: `ChatAssistantOptions.modelId` is optional and admin-only by code — the visitor agent ignores it and the runtime uses the
  catalog fallback for visitor turns.
- **Persistence**: the dropdown is sticky — picking a new model also fires `chatConfigDefaultModelSet` so the next chat opens with the new
  default.

See [`docs/features/admin-chat-config.md`](../features/admin-chat-config.md) for the full surface, dropdown behavior, and firewall details.
