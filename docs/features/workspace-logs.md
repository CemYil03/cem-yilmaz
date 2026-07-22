# Workspace logs

## User behavior

Admins open `/workspace/logs` (hub → Public site → Logs) to triage recent server log rows: filter by level, search the message, expand JSON
context. Read-only; no live tail.

## Options considered

See [architecture/logging.md](../architecture/logging.md) — the viewer is a thin UI over the PostgreSQL logger decision.

## Option chosen

In-app GraphQL-backed list under the admin namespace, URL-driven filters, same workspace chrome as other focus areas.

## Implementation

Deferred to [architecture/logging.md#viewer](../architecture/logging.md#viewer) for schema, query, and route files. Hub tile wiring:
[workspace-hub.md](./workspace-hub.md).
