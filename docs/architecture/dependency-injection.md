# ServerRuntime

## Context

Resolver functions, commands, queries, and guards all need access to shared infrastructure: the database, pub-sub publishing, and pub-sub
subscribing. Passing these as individual parameters would create unwieldy function signatures.

## Decision

A `ServerRuntime` interface that bundles all shared infrastructure into a single dependency injection container, created once via
`serverRuntimeCreate()`.

### Interface

Defined in `src/server/domain/ServerRuntime.ts`:

```typescript
interface ServerRuntime {
  db: Database;
  log: Logger;
  subscribe: {
    to: (key: string) => AsyncIterableIterator<any>;
  };
  publish: {
    userUpdates: (args: { userId: string }) => Promise<void>;
    chatUpdates: (args: { generationId: string; update: GqlSChatUpdate }) => Promise<void>;
  };
  jobs: {
    enqueue: <TData>(definition: QueuedJobDefinition<TData>, data: TData, options?: ...) => Promise<string | null>;
  };
  ai: {
    userConversationModel: () => LanguageModel;
  };
  browser: {
    capture: (options: BrowserCaptureOptions) => Promise<Buffer>;
  };
}
```

- **`db`**: Drizzle ORM database instance for all database operations
- **`log`**: structured logger that persists records to the `logs` table (see `loggerCreate.ts`)
- **`subscribe.to(key)`**: returns an async iterator for a pub-sub channel (used by subscription resolvers)
- **`publish.*`**: typed methods for publishing to specific channels (used by commands and agents)
- **`jobs.enqueue`**: enqueues a typed pg-boss job — see [jobs.md](./jobs.md). The optional `transaction` lets a command enqueue work
  atomically with its own writes.
- **`ai.*`**: factory functions returning `LanguageModel` instances. Provider, model id, and API key are bound here so tests can inject a
  `MockLanguageModelV3` (see `src/server/test/aiTestUtils.ts`) and never reach a real LLM endpoint. Capability-specific env validation (e.g.
  `GOOGLE_GENERATIVE_AI_API_KEY`) lives in `serverRuntimeCreate`, not in `environmentVariablesCreate` — see
  [environment.md](./environment.md#capability-specific-variables).
- **`browser.capture`**: drives a singleton headless Chromium against an internal `/server/*` route to produce an image of the rendered
  React UI — see [server-side-rendering.md](./server-side-rendering.md). Tests stub this to return a fixed `Buffer` and never launch a real
  browser. The `SERVER_TOKEN_SECRET` validation lives at the call site (`serverToken.ts`), not at boot, so projects that don't yet wire a
  render path don't need to set the variable.

### Factory

`serverRuntimeCreate()` in `src/server/domain/serverRuntimeCreate.ts` creates the runtime:

1. Initializes `PubSubPostgres` with the database connection
2. Wraps the pub-sub into typed `subscribe` and `publish` interfaces
3. Validates capability-specific env vars (e.g. throws if `GOOGLE_GENERATIVE_AI_API_KEY` is missing) and binds the LLM provider
4. Wires `jobs.enqueue` to the pg-boss singleton and `browser.capture` to the singleton-Chromium renderer
5. Returns the assembled `ServerRuntime`

### Usage Pattern

`resolversCreate()` creates a single `ServerRuntime` instance and passes it to all resolver functions:

```typescript
const serverRuntime = serverRuntimeCreate();
return {
  Query: {
    session: (_, __, ctx) => sessionFindOne(serverRuntime, ctx),
  },
  Mutation: {
    doSomething: (_, args, ctx) => someCommand(serverRuntime, args, ctx),
  },
};
```

Commands and queries receive `serverRuntime` as their first argument.

### Key Files

- `src/server/domain/ServerRuntime.ts` — interface definition
- `src/server/domain/serverRuntimeCreate.ts` — factory function
- `src/server/graphql/resolversCreate.ts` — where the runtime is created and distributed

## Alternatives Considered

- **Global singletons**: Simpler but harder to test and makes dependencies invisible
- **GraphQL context**: Apollo context is per-request; ServerRuntime is per-process (pub-sub connections and the database pool should not be
  recreated per request)
- **Dependency injection framework**: Overkill for the current scope; a plain factory function is sufficient

## Consequences

- All shared infrastructure is discoverable through one interface
- Adding a new shared dependency means extending the `ServerRuntime` interface and updating `serverRuntimeCreate()`
- The runtime is created once at server startup (inside `resolversCreate()`), so state like pub-sub connections is shared across all
  requests
