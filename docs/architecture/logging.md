# Persistent Logging

## Context

Commands and agents need durable, queryable error/event records. Console-only logging disappears on container restart; an external vendor
adds cost and another dependency for a single-operator site that already runs PostgreSQL.

## Decision

**PostgreSQL-backed logging** with dual console output, exposed as `ServerRuntime.log` from `loggerCreate(db)`.

Four levels: `error`, `warn`, `info`, `debug`. Rows land in the `Logs` table (`src/server/db/schema.ts`). Inserts are fire-and-forget so
logging never blocks a request; insert failures fall back to `console.error`.

## Alternatives Considered

| Option                             | Why rejected                             |
| ---------------------------------- | ---------------------------------------- |
| Console-only                       | Ephemeral; gone on restart               |
| External service (Datadog, Sentry) | Extra infra/cost for current stage       |
| File-based logs on the container   | Harder to query; lost on ephemeral disks |

## Consequences

- Logs are queryable with ordinary SQL / GraphQL and backup with the rest of the DB.
- High-volume `debug` in production can grow the table — triage via `/workspace/logs` and eventual retention policy.
- The admin **viewer** at `/workspace/logs` is documented below; platform wiring stays on this ADR.

## How it works

### Database table

| Column      | Type                       | Notes                                       |
| ----------- | -------------------------- | ------------------------------------------- |
| `logId`     | `uuid` (PK)                | Generated per log entry                     |
| `sessionId` | `uuid`                     | Optional session that triggered the log     |
| `level`     | `varchar` NOT NULL         | `'error'` / `'warn'` / `'info'` / `'debug'` |
| `message`   | `varchar` NOT NULL         | Human-readable message                      |
| `context`   | `jsonb`                    | Optional structured metadata                |
| `createdAt` | `timestamp with time zone` | Defaults to `now()`                         |

### Logger

Defined in `src/server/utils/loggerCreate.ts`. `Error` instances become `message` + stack context; other values are stringified. Commands
pass the error and requesting session:

```ts
catch (error) {
    serverRuntime.log.error(error, requestingSession);
    throw error;
}
```

### Key files

- `src/server/db/schema.ts` — `logs` table
- `src/server/utils/loggerCreate.ts` — factory
- `src/server/domain/ServerRuntime.ts` / `serverRuntimeCreate.ts` — `log` on the DI container

## Viewer

`/workspace/logs` — read-only triage surface (workspace hub → Public site → Logs):

- Newest-first list, server-clamped to 1000 rows (200 by default).
- Level filter and case-insensitive substring search on `message` (`%` / `_` escaped server-side).
- Filters in the URL (`?level=…&search=…`). No live tail.
- Gated by `User.admin` like the rest of the workspace.

Viewer files: `adminLogFindMany`, `toGqlLog`, `src/routes/{-$locale}/workspace/logs.tsx`, `LogsAdminPage.graphql`.
