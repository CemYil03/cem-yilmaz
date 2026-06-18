# File Storage

## Context

The template needs a place to put user-uploaded files (today: chat attachments — images, PDFs, arbitrary documents) and a posture for any
future binary payload that isn't a row of structured data. The decision touches deployment shape, backup strategy, request paths, and the
authorization model: where the bytes live changes how every other system around them behaves.

Three broad options are on the table:

1. **Postgres** — store bytes in a `bytea` column on a regular table.
2. **Local filesystem** — write files to a path on disk, keep a row in Postgres pointing at that path.
3. **Object storage (S3 / R2 / GCS)** — upload to an external bucket, keep a row in Postgres pointing at the object key.

The constraint that drives the call: this template is shipped as a **single-container deployment** (Coolify pulls one Docker image, runs it
behind a reverse proxy, points it at a managed Postgres). It is meant to be cloned and stood up by one developer in an afternoon, with no
external services beyond a database. Anything that adds a second piece of infrastructure on day one is a tax paid by every project that
forks this template — including the ones that will never need horizontal scale.

## Decision

**Files live in Postgres as `bytea` columns** in a single, **consumer-agnostic** `FileUploads` store. Each row carries the original
filename, IANA media type, byte length, and the raw payload, and is owned by a user. Other parts of the app reference uploads by
`fileUploadId` — typically through their own join row, the way chat does — rather than each domain growing its own blob table. An
HTTP-route-side per-file size cap (10 MB at the upload route today) bounds the in-memory cost so the payload column stays well-behaved
without streaming.

The canonical store is `FileUploads` in `src/server/db/schema.ts`:

```text
FileUploads
  fileUploadId PK, userId FK → users, filename, mediaType, size, bytes bytea, createdAt
```

Chat is the first consumer: the `ChatMessageUserAttachments` join row links a `ChatMessagesUser` message to one or more `FileUploads` rows
in send-order. New consumers (avatars, document uploads, generated artifacts, etc.) follow the same pattern — reference
`FileUploads.fileUploadId` from a domain-specific join row, layer per-consumer cascade and authorization rules on top. A new domain-specific
blob table is the exception, not the default.

The upload and download routes are likewise consumer-agnostic:

- `POST /api/file-uploads` — multipart upload, returns `{ fileUploadId, filename, mediaType, size }`.
- `GET /api/file-uploads/:fileUploadId` — streams the bytes back, authorized by ownership today.

### Why `bytea` over `oid` / large objects

- `bytea` round-trips as a normal column on `INSERT` / `SELECT`. Drizzle, the migration runner, and pg's logical replication all see it as a
  plain column. Large objects (`oid` / `pg_largeobject`) require a separate `lo_create` / `lo_write` API and a sidecar table that the rest
  of the persistence stack would also have to learn to clean up.
- The per-file cap keeps bytes small enough that streaming buys nothing — the entire payload fits in memory comfortably during the
  insert/select round trip.
- Drizzle has no first-class `bytea` builder, so the schema defines one via `customType` (`src/server/db/schema.ts`) that round-trips as a
  Node `Buffer`. This is a one-line price for a column type the rest of the codebase treats as ordinary.

### Lifecycle

- **Atomic writes**: the `bytea` insert and any consumer-side join-row inserts go in the same transaction as the owning entity's write.
  Subscribers never see a half-attached message (see [chat-persistence.md](./chat-persistence.md#attachments) for the chat-specific shape).
- **Cascade**: deletion follows the FK chain — drop the user, the user's file uploads go with them. Consumer join rows cascade away with
  their owning entity (e.g. chat-message delete drops the `ChatMessageUserAttachments` join rows but leaves the underlying `FileUploads` row
  reachable by id; that row is removed when the user is). No orphaned blobs to garbage-collect on a separate schedule.
- **Backups**: `pg_dump` covers everything. There is no second backup pipeline to set up, rotate, or test-restore.
- **Replication**: logical / physical replication carries the bytes along with the rows. Failover treats files like every other piece of
  state.

### When this stops being right

This decision is calibrated for the template's defaults — single container, managed Postgres, per-file caps in the low tens of MB. Projects
forking the template should revisit it when any of the following becomes true:

- **Total file volume is large relative to the active dataset.** A few GB of attachments alongside a 100 MB transactional dataset is fine;
  hundreds of GB of media on top of a small operational schema makes `pg_dump`, replication, and instance sizing painful.
- **Per-file size grows past tens of MB.** The "fits in memory" assumption that lets us skip streaming breaks down, and `bytea` is a poor
  fit for streaming.
- **Files need to be served directly to clients at high volume.** Postgres-backed delivery routes through the Node process; a CDN-fronted
  bucket is the right shape once read traffic dominates.
- **The deployment goes horizontally multi-region.** Postgres still works, but at that point a second piece of infrastructure (object store)
  is no longer the marginal cost it would be on day one.

The migration path off Postgres is intentionally cheap: `FileUploads` already has the metadata columns an external store would key off
(`filename`, `mediaType`, `size`), so swapping `bytes bytea` for `objectKey varchar` is a column-level change. Consumers reference uploads
by `fileUploadId` only — they never see the bytes column directly — so a swap is invisible to every join-table and resolver above the store.
Until that day, the row-shaped approach keeps the deployment surface area small.

## Alternatives Considered

| Alternative                  | Why rejected                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Local filesystem**         | Requires a Docker volume mount in Coolify (extra config per environment), couples the file lifecycle to a path the database doesn't see (orphans on failed inserts, ghosts on cascaded deletes), and forecloses horizontal scale — two app containers can't share `/var/app/uploads` without adding NFS or a shared volume. Backups now need a second pipeline alongside the DB dump.                     |
| **Object storage (S3 etc.)** | Adds a second external dependency on day one — credentials, bucket lifecycle, CORS, presigned URL plumbing, and a second authorization surface that has to stay in sync with the application's own. Pays off at scale; overkill for the single-container baseline this template targets. The migration path off `bytea` is a column-level change, so we defer the cost until a project actually needs it. |
| **`oid` / large objects**    | Separate `lo_create` / `lo_write` API, a sidecar `pg_largeobject` table the rest of the persistence stack has to learn about for cleanup, and no benefit at the file sizes a per-route cap admits.                                                                                                                                                                                                        |

## Consequences

- **Single-container deploys stay single-container.** Cloning the template and pushing to Coolify needs Postgres and nothing else; no bucket
  to provision, no volume to mount.
- **Files inherit the database's operational story.** Backups, restores, replication, transactional integrity, and authorization all work
  exactly like every other table. There is one mental model for "where state lives," not two.
- **Database size grows with file volume.** Acceptable because per-file caps bound the rate, and the deployment is sized for a transactional
  workload anyway. Projects that expect large media volumes should plan a migration before that growth becomes the dominant cost driver.
- **Reads route through the Node process.** Files served to clients flow through an authenticated route handler. This is the right shape for
  short-lived, authorized access; it is the wrong shape for high-volume public CDN delivery.
- **Adding a new consumer is a one-table change.** Define a join row that FKs from the consumer entity to `FileUploads.fileUploadId`, layer
  per-consumer cascade and authorization rules on top, run `npm run db:generate`. No second system to wire, no parallel blob table to
  invent.
