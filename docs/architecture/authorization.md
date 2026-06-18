# Authorization

## Context

Mutations and subscriptions need access control to ensure only authorized sessions or users can perform certain operations.

## Decision

Guard functions in `src/server/guards/` that validate the session or user context before allowing an operation to proceed.

### How It Works

Guards are plain functions that receive the `ServerRuntime` and the GraphQL context (which contains the session). They throw an error if the
caller is not authorized.

Guards are imported into `resolversCreate.ts` and called at the start of the relevant resolver:

- **Mutation guards**: called before executing the command
- **Subscription guards**: called in the `subscribe` function before returning the async iterator

### Naming Convention

Guard files follow the pattern `guard{Entity}{Context}`:

- `guardUserSubscription` — validates that the session can subscribe to user updates
- `guardSessionMutation` — validates that the session can perform session-level mutations

### Key Files

- `src/server/guards/` — guard function implementations (one file per guard)
- `src/server/graphql/resolversCreate.ts` — where guards are wired into resolvers

## Alternatives Considered

- **Middleware / directive-based auth**: More declarative but harder to debug and less explicit in resolver code
- **Context-level auth (reject at request level)**: Too coarse — different operations need different authorization rules

## Consequences

- Authorization logic is explicit and co-located with the resolver wiring
- Each guard is independently testable
- Adding a new protected operation requires importing and calling the guard in `resolversCreate.ts`
