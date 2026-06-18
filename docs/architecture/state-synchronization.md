# Real-Time (Subscriptions)

## Context

The application needs real-time updates for user state changes and AI generation streaming. The transport must work through standard HTTP
infrastructure without requiring WebSocket upgrades.

## Decision

GraphQL subscriptions over Server-Sent Events (SSE), backed by PostgreSQL NOTIFY/LISTEN for pub-sub.

### Data Flow

1. Client initiates a subscription via the URQL SSE exchange, which sends a POST to `/api/stream`
2. The server route creates a `ReadableStream` and starts the subscription
3. `executeGraphQLSubscription()` calls the resolver's `subscribe` method
4. The resolver calls `serverRuntime.subscribe.to(key)`, which returns an `AsyncIterableIterator` from `PubSubPostgres`
5. `PubSubPostgres` issues `LISTEN "key"` on a dedicated PostgreSQL connection
6. When something publishes (e.g., `serverRuntime.publish.chatUpdates()`), `PubSubPostgres` calls `SELECT pg_notify($1, $2)`
7. PostgreSQL delivers the notification to the listener connection
8. The payload flows through the `AsyncIterableIterator` back to the SSE stream as `event: next\ndata: {...}\n\n`
9. The URQL SSE client receives the event and updates the React component

### PubSubPostgres Design

Key design decisions in `src/server/graphql/PubSubPostgres.ts`:

- **Dedicated listener connection**: LISTEN requires a long-lived connection that is not pooled. A separate `pg.Client` is used for
  listening while the pool handles publishing and regular queries.
- **Lowercase channel normalization**: PostgreSQL folds unquoted identifiers to lowercase, but `pg_notify()` takes a text parameter with no
  folding. All channel names are normalized to lowercase to prevent mismatches.
- **Ref-counted LISTEN/UNLISTEN**: Multiple subscribers to the same channel share a single `LISTEN`. The channel is only `UNLISTEN`ed when
  the last subscriber disconnects.
- **Per-trigger lock**: A promise chain per channel prevents concurrent subscribe/unsubscribe operations from racing.
- **PubSubMemory**: An in-memory `EventEmitter`-based alternative for testing or environments without PostgreSQL.

### SSE Stream Details

The `/api/stream` endpoint (`src/routes/api/stream.ts`):

- Sends an initial padding comment (2048 spaces) to force proxy flush
- Formats events as standard SSE: `id: N\nevent: next\ndata: JSON\n\n`
- Properly cleans up the subscription iterator when the client disconnects (`cancel()` on the `ReadableStream`)
- Handles controller-closed errors gracefully

### Subscription Channels

Currently defined in `ServerRuntime.publish` (see `src/server/domain/serverRuntimeCreate.ts`):

| Channel       | Trigger Key                   | Payload          | Use Case                                                         |
| ------------- | ----------------------------- | ---------------- | ---------------------------------------------------------------- |
| `userUpdates` | `{userId}`                    | `{}`             | User state changes                                               |
| `chatUpdates` | `chat-updates:{generationId}` | `GqlSChatUpdate` | AI generation streaming and chat-message lifecycle notifications |

The `chat-updates:` prefix namespaces the channel so a generation id reused as some other key cannot collide; `userUpdates` publishes
directly against the user id with no prefix.

### Key Files

- `src/server/graphql/PubSubPostgres.ts` — pub-sub implementation (both PostgreSQL and memory variants)
- `src/server/domain/ServerRuntime.ts` — typed publish/subscribe interface
- `src/server/domain/serverRuntimeCreate.ts` — wiring PubSubPostgres into ServerRuntime
- `src/server/graphql/resolversCreate.ts` — subscription resolver definitions
- `src/routes/api/stream.ts` — SSE endpoint
- `src/web/graphql/client.ts` — URQL SSE client configuration

## Alternatives Considered

- **WebSockets (e.g., graphql-ws)**: More common for GraphQL subscriptions but requires WebSocket upgrade support from all infrastructure
  (load balancers, proxies). SSE works over standard HTTP.
- **Polling**: Simpler but higher latency and server load; unsuitable for token-by-token AI streaming
- **Redis pub-sub**: More scalable for multi-process deployments but adds an infrastructure dependency. PostgreSQL NOTIFY/LISTEN is
  sufficient for single-server deployment via Coolify.

## Consequences

- SSE is unidirectional (server to client) — client-to-server communication still goes through mutations
- PostgreSQL NOTIFY payload is limited to ~8000 bytes — large payloads must be chunked or referenced by ID
- Single listener connection means a single point of failure for all subscriptions — the reconnection logic handles this but there is a
  brief gap
