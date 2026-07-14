# CQRS (Command Query Responsibility Segregation)

## Context

GraphQL resolvers can grow complex when mutations (writes) and queries (reads) share the same code structure. Mapping logic between database
types and GraphQL types is often duplicated across both.

## Decision

Separate server-side logic into three directories:

- **`src/server/commands/`** — mutation resolvers (write operations)
- **`src/server/queries/`** — query resolvers (read operations)
- **`src/server/mappers/`** — shared transformation functions

### Commands

Each file exports an async function that performs a write operation. Commands may:

- Insert, update, or delete database records
- Call AI agents from `src/server/agents/`
- Publish events via `ServerRuntime.publish`
- Return GraphQL types (using mappers for the transformation)

Example: `sessionUpsert.ts` creates or updates a session and returns `GqlSSession`.

A command file may additionally export the AI-SDK `tool()` factory that exposes the command to the personal-assistant sub-agents — colocated
below the command function and named `tool<Domain><Action>`. The factory is a thin wrapper: validate input, call the local command, return
its result. See [`docs/architecture/agent-delegation.md`](./agent-delegation.md) for the sub-agent tooling pattern.

### Queries

Each file exports a single async function that performs a read operation. Queries:

- Select from the database
- Transform results using mappers
- Return GraphQL types

Example pattern: `{accessPath}{Entity}{FindOne|FindMany|Count|Counts}` — `adminProjectFindOne.ts`, `adminMediaMovieFindMany.ts`,
`adminChatCount.ts`, `publicCvExperienceFindMany.ts`. Internal helpers not mounted on the resolver chain may omit the `accessPath`
(`chatFindOne.ts`, `fileUploadFindOne.ts`) but keep the cardinality suffix. See
[`docs/conventions.md`](../conventions.md#query-naming--the-four-pieces) for the full rule.

### Mappers

Pure functions that transform a database row type to its corresponding GraphQL type. Named `toGql{Entity}`.

Example: `toGqlSession(session: Session): GqlSSession`

Mappers are shared by both commands and queries, eliminating duplicate transformation logic.

### Wiring

All functions are imported and called in `src/server/graphql/resolversCreate.ts`:

```typescript
export function resolversCreate(): GqlSResolvers {
  const serverRuntime = serverRuntimeCreate();
  return {
    Query: {
      session: (_, __, ctx) => sessionFindOne(serverRuntime, ctx),
    },
    Mutation: {
      doSomething: (_, args, ctx) => someCommand(serverRuntime, args, ctx),
    },
  };
}
```

## Alternatives Considered

- **Flat resolvers file**: Simpler but gets unwieldy quickly; no separation of read/write concerns
- **Domain-driven directories (per entity)**: Groups all session logic together but obscures the read/write separation and makes it harder
  to enforce consistency

## Consequences

- Clear separation of read and write paths
- Mappers prevent duplication and ensure consistent type transformations
- One function per file keeps each module focused and testable
- `resolversCreate.ts` is the single wiring point — it grows linearly with the schema but keeps the dependency graph visible
