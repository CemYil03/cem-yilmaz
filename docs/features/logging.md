# Persistent Logging

## User Behavior

Commands log errors (and other events) to a PostgreSQL `Logs` table so that issues are queryable and persist beyond process restarts. The
logger also writes to the console for immediate dev visibility.

## Options Considered

1. **Console-only logging** — simple but ephemeral; logs vanish when the container restarts.
2. **External logging service** (e.g., Datadog, Sentry) — powerful but adds infrastructure cost and a third-party dependency.
3. **PostgreSQL-backed logging** — queryable, persistent, zero additional infrastructure since we already use PG.

## Option Chosen

**PostgreSQL-backed logging** with dual console output. Keeps things simple and self-contained for the current stage of the project.

## Implementation Details

### Log Levels

Four levels: `error`, `warn`, `info`, `debug`.

### Database Table

`Logs` table in `src/server/db/schema.ts`:

| Column      | Type                       | Notes                                       |
| ----------- | -------------------------- | ------------------------------------------- |
| `logId`     | `uuid` (PK)                | Generated per log entry                     |
| `sessionId` | `uuid`                     | Optional session that triggered the log     |
| `level`     | `varchar` NOT NULL         | `'error'` / `'warn'` / `'info'` / `'debug'` |
| `message`   | `varchar` NOT NULL         | Human-readable message                      |
| `context`   | `jsonb`                    | Optional structured metadata                |
| `createdAt` | `timestamp with time zone` | Defaults to `now()`                         |

### Logger Interface

Defined in `src/server/utils/loggerCreate.ts`:

```ts
type LogInput = unknown;
type LogSession = { sessionId: string } | null | undefined;

interface Logger {
  error: (input: LogInput, session?: LogSession) => void;
  warn: (input: LogInput, session?: LogSession) => void;
  info: (input: LogInput, session?: LogSession) => void;
  debug: (input: LogInput, session?: LogSession) => void;
}
```

The logger normalizes input internally: `Error` instances are decomposed into `message` + `context` (with name and stack); all other values
are stringified.

### Behavior

- **Dual output**: each method writes to the corresponding `console.*` method and inserts a row into the `Logs` table.
- **Fire-and-forget**: the DB insert is not awaited. Failures are caught and sent to `console.error` so logging never blocks or crashes the
  request.

### ServerRuntime Integration

`ServerRuntime.log` exposes the logger. Created via `loggerCreate(db)` in `serverRuntimeCreate.ts`.

### Usage in Commands

Commands pass the error directly to the logger along with the requesting session for traceability:

```ts
catch (error) {
    serverRuntime.log.error(error, requestingSession);
    throw error;
}
```

### Key Files

- `src/server/db/schema.ts` — `logs` table definition
- `src/server/utils/loggerCreate.ts` — logger factory
- `src/server/domain/ServerRuntime.ts` — `log` property on the DI container
- `src/server/domain/serverRuntimeCreate.ts` — wiring

## Viewer

Cem reads recent log rows in the browser at `/workspace/logs` (workspace hub → "Public site" group → "Logs"). The surface is read-only
triage:

- Newest-first list, server-clamped to 1000 rows (200 by default).
- Level filter (`error` / `warn` / `info` / `debug`) and a case-insensitive substring search on `message`. `%` and `_` are escaped
  server-side so a query like `100%` matches literally.
- Each row shows level, relative + absolute timestamp, a short `sessionId` chip when set, the message, and a collapsible JSON `context` when
  present.
- Filters live in the URL (`?level=…&search=…`) so a view is deep-linkable. No live tail.

The viewer is gated by the parent `guardAdmin` on `Query.admin` — the same chain that protects the rest of the workspace surface.

### Viewer Files

- `src/server/graphql/schema.graphqls` — `Log` type, `LogLevel` enum, `Admin.logs(level, search, limit)` field
- `src/server/queries/logsList.ts` — query (level/search filters, limit clamping, LIKE-escape)
- `src/server/mappers/toGqlLog.ts` — DB row → GraphQL
- `src/routes/{-$locale}/workspace/logs.tsx` — route
- `src/routes/{-$locale}/workspace/LogsAdminPage.graphql` — client-side query
