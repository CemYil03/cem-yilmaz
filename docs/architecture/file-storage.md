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
in send-order. The workspace projects feature is the second: `AdminProjectFile` rows reference `FileUploads.fileUploadId` and carry their
own metadata (`kind`, `label`, `pinned`, optional `activityId` backlink). On project delete the join rows cascade away; the underlying
upload row stays around (it may still be reachable from a chat message, and the user-row cascade reclaims storage when the owner goes). The
shared mapper `src/server/mappers/toGqlFileUpload.ts` produces the `FileUpload` GraphQL shape for both consumers — `url` always points at
`/api/file-uploads/:id`.

New consumers (avatars, generated artifacts, etc.) follow the same pattern — reference `FileUploads.fileUploadId` from a domain-specific
join row, layer per-consumer cascade and authorization rules on top. A new domain-specific blob table is the exception, not the default.

**One such exception is `TtsAudioCache`** — the read-aloud feature's server-side cache of synthesized MP3 clips. It lives outside
`FileUploads` because it doesn't fit either of the store's core invariants: its rows are not owned by a user (the cache is anonymous and
shared across sessions, so re-listening to the same message from any device is a hit), and its primary key is content-derived
(`sha256(text|voice|model|format)`) rather than a UUID. Making `FileUploads.userId` nullable to accommodate it would loosen the ownership
model every other consumer relies on. The exception carries a matching bespoke access path (`ttsAudioCacheFindOne`, `ttsAudioCacheUpsert`)
and is documented in [Read-aloud (TTS cache)](#read-aloud-tts-cache) below. Future domains with the same shape — anonymous,
content-addressed, shared — belong in their own table too; user-owned uploads still default to `FileUploads`.

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

## Read-aloud (TTS cache)

<a id="read-aloud"></a>

Every assistant text message exposes a **read-aloud** control next to Copy. The primary button POSTs cleaned message text to `/api/tts`,
which calls **Gemini TTS** (`gemini-2.5-flash-preview-tts`, voice `Zephyr`) server-side and returns MP3. The browser plays via `MediaSource`
— bytes append to a `SourceBuffer` as they arrive, so playback starts on the first ~100 ms rather than waiting for the full clip.
Neural-quality output regardless of OS or browser; no on-device voices.

The primary button walks four states — speaker (idle) → spinner (loading) → pause (playing) → play (paused). A separate **stop** button
appears while audio is playing or paused and hard-resets to idle so the next click starts at position 0. Pause keeps the audio element and
buffered MP3 in place; resume continues without re-fetch or re-synthesis. Native pause/play events (mediaSession, media keys, headphone
unplug) sync via listeners on the `HTMLAudioElement`. `speak()` on any button hard-stops prior playback app-wide so two messages never
overlap.

The message body is markdown, so it is stripped before the API call — code fences become a spoken "Codeblock" / "code block" placeholder,
backticks/asterisks are dropped, links keep the label only, list markers and headings are stripped. Gemini receives plain prose; language is
auto-detected (no explicit `lang` param).

**Caching.** Identical `(text, voice, model, format)` tuples resolve to the same SHA-256 key; the MP3 lives in `TtsAudioCache`. A cache hit
skips Gemini and returns the bytes in one response with `Cache-Control: private, max-age=86400` so the browser HTTP cache covers subsequent
listens. The cache is anonymous — no `userId` — because the same body always yields the same audio. That is why this table sits outside
`FileUploads` (see Decision above).

**Chunked streaming synthesis.** On cache miss, the server splits text into ~300-character chunks along sentence boundaries
(`src/web/utils/textToSentences.ts`), synthesizes each chunk serially via Gemini, and feeds raw PCM through a long-lived `ffmpeg-static`
process that transcodes to MP3 on the fly. MP3 bytes are teed to the response `ReadableStream` and a Buffer accumulator; on ffmpeg close the
completed clip is written to `TtsAudioCache`. Client disconnect kills ffmpeg and skips the cache write so a partial stream cannot poison the
next request.

**Pre-warm on hover / focus.** `SpeakButton` fires `preload(text)` on `onMouseEnter` / `onFocus` so the fetch is already in flight on click.
`useSpeechSynthesis.preload()` de-dupes on `text` and adopts the in-flight response when `speak()` is called with the same string. Hovering
a different button aborts the previous preload; leaving without clicking keeps the preload for a 30 s grace window. Because of the cache,
the only Gemini call a hover-then-never-click pays for is the first hover on a given message across the app's lifetime.

| Concern           | Where                                                                                                                                                                                                                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API route         | `src/routes/api/tts.ts` — POST, no `userId` required. Cache miss: chunked `audio/mpeg` (`Cache-Control: no-store`). Cache hit: full clip + `ETag` + `Cache-Control: private, max-age=86400`. Uses `GOOGLE_GENERATIVE_AI_API_KEY`. `sessionUpsert` runs on every request (anchor for a future rate limit). |
| Hook              | `src/web/hooks/useSpeechSynthesis.ts` — `state: 'idle' \| 'loading' \| 'playing' \| 'paused'`; `speak` / `pause` / `resume` / `stop` / `preload`. Progressive fallback to blob download when `MediaSource` or `audio/mpeg` is unavailable.                                                                |
| Cache             | `TtsAudioCache` in `src/server/db/schema.ts`; `ttsAudioCacheFindOne`, `ttsAudioCacheUpsert`; `ttsContentHash` — SHA-256 of `${text}\|${voice}\|${model}\|${format}`.                                                                                                                                      |
| Transcoder        | `src/server/utils/audioTranscode.ts` — streaming PCM → MP3 via `ffmpeg-static`.                                                                                                                                                                                                                           |
| Markdown stripper | `src/web/utils/markdownToPlainText.ts` — deterministic regex; no `remark` / `unified`.                                                                                                                                                                                                                    |
| Sentence splitter | `src/web/utils/textToSentences.ts` — regex with a greedy ~300-char coalesce.                                                                                                                                                                                                                              |
| Button            | `SpeakButton` in `src/web/components/chat-message/shared.tsx` (alongside `CopyButton`). Shared via `<ChatMessage />` on visitor and workspace surfaces.                                                                                                                                                   |

**Live-stream reading is out of scope.** The button reads the final persisted `ChatMessageAssistantText.body`, not live
`ChatUpdateAssistantTextChunk` deltas. Chunked synthesis cuts first-audio latency for the completed message; reading while still streaming
would require hooking `useChatLiveUpdates` and can land later.

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
