# Multi-Agent Chat

The site has two AI surfaces:

1. **Public visitor chat at `/chat`** — anonymous-or-cookie-session visitors. Answers questions about Cem and his work.
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
  // 'public' for visitor chats at /chat; 'admin' for the personal assistant
  // at /workspace/assistant. Stamped by the creating mutation; never updated.
  scope: varchar().$type<'public' | 'admin'>().notNull().default('public'),
  lastModifiedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});
```

Existing rows get `'public'` by the column default — Phase 1 only ever wrote visitor chats, so the backfill is correct.

### Agent factories

Replace `agentUserConversation.ts` with two siblings:

- `src/server/agents/agentVisitorAboutCem.ts` — visitor system prompt, no DB tools, no approval gating in practice.
- `src/server/agents/agentPersonalAssistant.ts` — personal-assistant system prompt, real tools (e.g. `toolNoteCreate`,
  `toolCalendarEventCreate`), all gated by `needsApproval` per the existing approval lifecycle.

Shared scaffolding (provider bindings, `stopWhen` rules, the `onStepFinish` plumbing) lives in a tiny helper, not a base class — each agent
file is self-contained enough to skim.

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
- `Mutation.admin` → `guardAdminMutation(session)`. **Phase 1: permissive.** The guard returns the namespace shape rather than throwing —
  the workspace hub composer needs the admin namespace reachable so Cem can use his own assistant, and the surface stays private through the
  noindex + unlinked + URL-obscured posture documented in `docs/features/workspace-hub.md`. Phase 2 fills in the GitHub-login allowlist
  check sourced from `WORKSPACE_GITHUB_LOGINS`.
- `AdminMutation.*` → resolved chat must have `scope = 'admin'`. The `guardAdminMutation` gate at the `admin` field already keeps
  unauthenticated callers out of the namespace; the per-mutation scope check stops a logged-in admin from accidentally posting into a
  visitor chat by chatId.
- `Query.admin` → `guardAdmin(session)`, the read-side counterpart with the same Phase 1 policy. Split from `guardAdminMutation` so Phase 2
  can layer different posture on writes (e.g. CSRF, narrower allowlist) without dragging the read path along.
- `Query.chat(chatId)` → resolved chat must have `scope = 'public'`.

### Routing

- `/chat` — visitor chat. Always creates new chats with `scope = 'public'`. Sends through `Mutation.chatMessageCreate` (visitor namespace).
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
