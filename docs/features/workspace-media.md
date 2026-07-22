# Workspace media: Movies + Series + YouTube + Podcasts

`/workspace/media` is the admin's private library for four things: a **movie watchlist** (want-to-watch / watching / watched / dropped, with
posters and ratings), a **TV series library** (same status vocabulary, plus completed / next-season tracking), a **YouTube channels** list,
and a **podcasts** list. YouTube and podcasts share the `AdminMediaChannel` table and are filtered by `platform` into separate tabs. The
YouTube list (filtered by topic) is the single source of truth for cross-view reads — `/workspace/software` renders the subset tagged `tech`
as its "Favourite tech channels" section without duplicating rows.

See also:

- [architecture/content-model.md](../architecture/content-model.md) — the DB-backed editable-list pattern this feature follows.
- [architecture/agent-delegation.md](../architecture/agent-delegation.md) — the media assistant sub-agent (`delegateToMedia`) wires up
  exactly like `delegateToProjects`.
- [features/workspace-projects.md](./workspace-projects.md) — sibling admin editor with the same shape.
- [features/cv.md](./cv.md) — the canonical seed-and-subscribe editor.

## User behavior

The page has four tabs, switched via a `?tab=movies|series|youtube|podcasts` search param (defaults to `movies`). Legacy `?tab=channels`
maps to YouTube. A `?focus=<id>` param resolves the correct tab from the id, scrolls the matching card into view, and highlights it for a
moment — the assistant's deep-links use this.

- **Movies** — sticky **search bar at the top** hits TMDB movie search live (300 ms debounce). Placeholder says "Film suchen…" / "Search a
  movie…" (movies only — series live on their own tab). Suggestions appear as a dropdown with poster thumbnails; clicking one calls
  `adminMediaMoviesAddFromTmdb`, which fetches full detail server-side and inserts the row into Watchlist. A subtle "Add manually" link at
  the bottom of the dropdown opens the empty edit dialog for films TMDB has never heard of. Cards sit in a dense responsive **poster-first
  grid** (`grid-cols-3` … `2xl:grid-cols-8`), grouped into four sections in this order: Watchlist → Watching → Watched → Dropped. Card =
  poster (2:3 `AspectRatio`) + compact title + release year, with a rating badge in the top-right corner on watched rows. Kebab menu on each
  card carries the quick actions (Mark watching / Mark watched → rating popover / Move to dropped / Edit / Delete). Clicking a card opens a
  **centered modal dialog** with the full edit form (title, release date via `DatePicker` with `captionLayout="dropdown"` for far-past
  years, runtime, overview, status select, rating, watchedAt, notes textarea, topics multi-select).
- **Series** — same dense poster-grid + status grouping as Movies, but the search hits TMDB TV (`tmdbTvSearch` →
  `adminMediaShowsAddFromTmdb`). Each card surfaces a completed badge or next-season hint (exact date formatted as `MMM yyyy`, or the rough
  label). The edit dialog adds:
  - **Series completed** toggle (`isCompleted`) — when on, next-season fields clear and hide.
  - **Next season (date)** — exact `DatePicker` value (`nextSeasonReleaseDate`).
  - **Next season (rough)** — free-form string (`nextSeasonReleaseRough`, e.g. "Herbst 2026" / "Fall 2026"). Both date fields can coexist;
    the card prefers exact → rough → completed.
- **YouTube** — avatar card grid (1 / 2 / 3 / 4 columns) of `platform: youtube` rows only. A sticky **search bar at the top** hits the
  YouTube Data API live (300 ms debounce): suggestions drop down with avatar + handle + subscriber count, and **clicking one adds the
  channel directly** via `adminMediaChannelsUpsert` (identity fields filled from the API; topics / notes left empty for later). There is
  **no manual identity entry on the add path**. Topic chips filter the grid (AND-composed, local state). Each card shows a large avatar,
  name, handle, topic chips, first-line notes preview, and an external-link affordance — no drag handles. Clicking the card opens the edit
  dialog (platform fixed to YouTube).
- **Podcasts** — same card layout over `platform: podcast` rows. No search API: an **Add podcast** button opens the create dialog. Topic
  chips filter the grid the same way as YouTube. Twitch / other platforms are not surfaced in the UI.

Topics on movies, series, YouTube channels, and podcasts are a **chip input**: known topics (the `AdminMediaTopic` enum) come as suggested
chips; free-form values work too (the column is a plain `text[]`, so ad-hoc topics can be added without a migration). Removing a chip
removes it from the array. The known vocabulary drives the UI autocomplete and the `AdminMediaTopic` GraphQL enum surface. Current known
topics: `tech`, `ai`, `software`, `gaming`, `movieCritic`, `entertainment`, `comedy`, `science`, `business`, `finance`, `news`, `music`,
`sports`, `lifestyle`, `education`.

All search fields across the movies / series / YouTube tabs (TMDB movie search, TMDB TV search, and the YouTube channel search) are built
from the shadcn **`InputGroup`** primitives (`InputGroupAddon` for the leading search icon + trailing spinner/clear button,
`InputGroupInput` for the field) rather than a hand-positioned icon over a bare `Input`.

Filter chips below the movies / series search bars narrow the visible grid by topic (`?topic=tech`). Multi-select AND-composes them. The
chips are auto-populated from the union of topics across the visible rows. YouTube and Podcasts keep topic filters in local state (not URL);
there is no free-text channel filter — the YouTube top-of-tab search box is the add flow, and the topic chips do the filtering.

## Options considered

| Approach                                                                    | Why we picked / didn't                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **One `Titles` table with a `kind` enum** (movie \| tv \| short)            | Cheapest schema on paper. Loses type-safe TV-specific tracking (completed / next-season fields) and forces every read to filter by `kind` even when the surface only cares about one shape. Dedicated `AdminMediaShow` table keeps the movie path lean. |
| **Movies + TV shows both in this phase** (chosen for series)                | Series landed with the fields the admin actually needs (completed + next-season exact/rough) without a full seasons/episodes cascade. Episode-level tracking stays deferred.                                                                            |
| **Local poster storage in `FileUploads`**                                   | Full control, but every add is a manual step and blob storage costs. TMDB's CDN URLs are stable and cache well; storing the URL as a `varchar` is one column instead of a join row.                                                                     |
| **No third-party integration** (paste poster URLs by hand)                  | Zero dependencies, poor UX. TMDB gives release date, runtime, and overview for free — a two-keystroke add flow is worth one env var.                                                                                                                    |
| **TMDB search + cached URL** (chosen)                                       | Server-side fetch at add-time, stores `tmdbId` + cached URLs + metadata. Cost: one optional env var; graceful degradation when unset (search returns empty, manual add still works).                                                                    |
| **Single-topic `varchar` enum** on channels (mirroring `CvSkill.category`)  | Strictest. Forces awkward choices for creators who span topics ("Fireship" is both tech and entertainment). One rigid column.                                                                                                                           |
| **Multi-topic M2M** (dedicated `MediaTopics` + `MediaChannelTopics` join)   | First M2M in the repo. Overkill unless topics themselves need pages/descriptions. `text[]` covers every current need with `WHERE :topic = ANY(topics)`.                                                                                                 |
| **Multi-topic `text[]` on both entities** (chosen)                          | Mirrors `cvExperience.technologies`. A channel can be `['tech','ai']`; a movie can be `['scifi','noir']`. Cross-view reads use `ANY(topics)` — the software page's "tech YouTubers" query is one line. New topics land without a migration.             |
| **Dedicated `AdminMediaChannel` ← `SoftwareArea` FK** for cross-referencing | Duplicates the intent of `topics`. If the reference axis is "these channels are relevant to software", the topic tag already carries that. Cross-section reads via topic scale to future areas (medical, finance) automatically.                        |
| **Channels grouped by topic sections** (v1)                                 | Worked for a short list; duplicated multi-topic channels and made scanning harder as the library grew. Replaced with a filterable card grid, later split into YouTube / Podcasts tabs.                                                                  |

## Option chosen

Three dedicated tables: `AdminMediaMovie`, `AdminMediaShow`, and `AdminMediaChannel`. All admin-only (no `*De` / `*En` pairs, same rationale
as Projects / Tasks). `topics` is `text[]` on all three — the clustering axis for the media page and the referent for cross-view reads. TMDB
is the primary add path for movies and series; the client falls through to manual entry when TMDB has no match or `TMDB_API_KEY` is missing.

## Implementation details

### Database schema

`AdminMediaMovie`:

- `movieId uuid PK`
- `title varchar` required
- `tmdbId int` — **unique nullable**, so a re-add of the same TMDB movie updates in place (`adminMediaMoviesAddFromTmdb` looks up before
  inserting), while multiple manually-entered rows coexist
- `posterUrl`, `backdropUrl varchar` — cached TMDB CDN URLs; no local blob storage
- `releaseDate date`, `runtimeMinutes int`, `overview text`
- `status varchar` (`watchlist | watching | watched | dropped`), default `watchlist`
- `rating int` — 1..10, admin's own
- `watchedAt timestamptz`, `notes text`
- `topics text[]` — free-form; the `mediaTopics` const array in `schema.ts` is the _known_ vocabulary
- `createdAt`, `updatedAt`
- Indexes: unique on `tmdbId`, `(status)` for the grouped-by-status list

`AdminMediaShow`:

- `showId uuid PK`
- `title varchar` required
- `tmdbId int` — **unique nullable**, same dedupe semantics as movies
- `posterUrl`, `backdropUrl varchar`
- `firstAirDate date`, `overview text`
- `status varchar` (`watchlist | watching | watched | dropped`), default `watchlist`
- `rating int` — 1..10
- `notes text`, `topics text[]`
- `isCompleted boolean` default `false` — series has ended; when true, next-season fields are cleared on write
- `nextSeasonReleaseDate date` — exact next-season air date when known
- `nextSeasonReleaseRough varchar` — free-form timing ("Fall 2026", "Q3 2027") when exact date is unknown
- `createdAt`, `updatedAt`
- Indexes: unique on `tmdbId`, `(status)`

`AdminMediaChannel`:

- `channelId uuid PK`
- `name varchar` required, `platform varchar` (`youtube | twitch | podcast | other`), `url varchar` required
- `handle varchar`, `avatarUrl varchar`, `description text`
- `topics text[]` — clustering axis; same string vocabulary as `AdminMediaMovie.topics` / `AdminMediaShow.topics`
- `priority int` default 0 — global ordering for drag-reorder via `adminMediaChannelReorder`
- `notes text`, `createdAt`, `updatedAt`
- Index: `(priority)`

Migrations: `drizzle/0017_violet_giant_man.sql` (movies + channels), `drizzle/0023_uneven_johnny_blaze.sql` (shows).

### GraphQL

Read namespace under `Admin.adminMediaFindOne` (reached via `sessionFindOne.user.admin.adminMediaFindOne`):

- `adminMediaMovieFindMany: [AdminMediaMovie!]!` — full library; ordered watching → watchlist → watched → dropped, then by `updatedAt DESC`
- `adminMediaShowFindMany: [AdminMediaShow!]!` — full series library; same status-bucket ordering as movies
- `adminMediaChannelFindMany(topic: String): [AdminMediaChannel!]!` — every favourite; ordered by `priority ASC, name ASC`. Passing `topic`
  filters via `WHERE :topic = ANY(topics)`; used by `/workspace/software` and any future cross-view section. Omit or pass `null` to return
  every channel.
- `adminMediaTmdbFindMany(query: String!): [AdminMediaTmdbMovieResult!]!` — live per-keystroke movie search; empty on missing key / TMDB
  error / empty query
- `adminMediaTmdbTvFindMany(query: String!): [AdminMediaTmdbTvResult!]!` — live per-keystroke TV search; same empty-fallback semantics
- `adminMediaYoutubeFindMany(query: String!): [AdminMediaYoutubeChannelResult!]!` — live per-keystroke channel search, same empty-fallback
  semantics as `adminMediaTmdbFindMany`

Write namespace under `AdminMutation` (gated by `guardAdminMutation`). Every entity mutation is a **batch** that returns
`MutationResult { success, referenceId, referenceIds }` — never the hydrated entity. The `userUpdates` subscription is the single source of
truth for the new state; `referenceIds` echoes the affected row ids in input order so a caller can address a freshly-created row without a
follow-up read. A single-item edit passes a one-element array (UI dialogs, agent tools, and status toggles all do this — there is no
parallel singular path). This matches the travel and CV batch conventions.

- `adminMediaMoviesUpsert(movies: [AdminMediaMovieInput!]!)`, `adminMediaMoviesDelete(movieIds: [ID!]!)` — every input with a `movieId` is
  updated, every input without one is inserted; the whole batch runs in one transaction. **Marking a movie watched is a
  `adminMediaMoviesUpsert`** with a one-element array carrying the existing row plus `status: watched` and `watchedAt` set (there is no
  separate `movieMarkWatched` mutation).
- `adminMediaMoviesAddFromTmdb(inputs: [AdminMediaMovieAddFromTmdbInput!]!)` — kept separate from `adminMediaMoviesUpsert` because it hits
  TMDB and has distinct control flow. TMDB fetches happen in parallel outside the transaction; only the DB writes are inside. Dedupes by
  `tmdbId` (refreshes metadata in place rather than inserting a duplicate). `referenceIds` echoes the resolved `movieId` per input in input
  order.
- `adminMediaShowsUpsert(shows: [AdminMediaShowInput!]!)`, `adminMediaShowsDelete(showIds: [ID!]!)` — parallel to movies.
- `adminMediaShowsAddFromTmdb(inputs: [AdminMediaShowAddFromTmdbInput!]!)` — fetches TMDB TV detail, seeds `isCompleted` /
  `nextSeasonReleaseDate` when available; `nextSeasonReleaseRough` stays admin-authored. Same batch + dedupe posture as
  `adminMediaMoviesAddFromTmdb`.
- `adminMediaChannelsUpsert(mediaChannels: [AdminMediaChannelInput!]!)`, `adminMediaChannelsDelete(channelIds: [ID!]!)` — new channels
  append at the bottom of every topic section (`priority = max + 1`, resolved inside the transaction so a batch of new rows lands
  contiguously); `adminMediaChannelReorder` is the sole writer of `priority` on update.
- `adminMediaChannelReorder(orderedIds)` — full-array rewrite (same shape as `cvEducationReorder`); already batch + `MutationResult`.

Every command publishes on `userUpdates` once after commit, so the media page's `WorkspaceMediaPageUpdates` subscription picks up new state
without a client-side re-fetch.

### TMDB client

`src/server/services/tmdbClientCreate.ts` — thin fetch wrapper around the TMDB v3 REST API. Entry points on `serverRuntime.tmdb`:

- `searchMovies(query)` → up to 10 hits with title, release date, poster URL, overview
- `getMovie(tmdbId)` → full detail (poster + backdrop + runtime + overview)
- `searchTv(query)` → up to 10 TV hits with title, first-air date, poster URL, overview
- `getTv(tmdbId)` → full detail plus best-effort `isCompleted` (TMDB status Ended/Canceled) and `nextSeasonReleaseDate` (from upcoming
  season air dates / `next_episode_to_air`)

`TMDB_API_KEY` is capability-lazy (see `environmentVariablesCreate.ts`). Missing → empty results, never a throw; the media page falls back
to manual entry. 5-second per-request timeout via `AbortSignal.timeout` so a stuck fetch can't block a search keystroke. Image URLs are
resolved to `image.tmdb.org` fully-qualified URLs at the boundary — the frontend never needs TMDB configuration.

### YouTube client

`src/server/services/youtubeClientCreate.ts` — thin fetch wrapper around the YouTube Data API v3. One entry point on
`serverRuntime.youtube`:

- `searchChannels(query)` → up to 10 hits enriched with handle + subscriber count via a follow-up `channels.list` call. Each result carries
  a pre-composed `canonicalUrl` (prefers the `@handle` form, falls back to `/channel/<id>`) so the client can drop it straight into the
  `AdminMediaChannelInput.url` field.

Same posture as the TMDB client: `YOUTUBE_API_KEY` is capability-lazy, missing key → empty results (never a throw), 5-second per-request
timeout. One user search costs two API calls (search 100 units + channels.list 2 units); free-tier quota is 10k units/day which is generous
for a personal library. The YouTube tab's add flow is **built entirely around this search** — the sticky search bar at the top of the tab
mirrors the movies / series TMDB search, and clicking a suggestion creates the channel directly (`adminMediaChannelsUpsert` with name, url,
handle, avatarUrl, and description from the API; topics / notes edited later). There is no manual identity entry on the YouTube add path.
Podcasts are added manually from the Podcasts tab.

### Assistant integration

`agentPersonalAssistantMedia` is the media sub-agent, wired the same way as `agentPersonalAssistantProjects`
([agent-delegation.md](../architecture/agent-delegation.md)). The orchestrator registers `delegateToMedia`; every media ask (add / rate /
list / delete, plus series and channel management) delegates a natural-language brief that the sub-agent handles with its own tools. The
sub-agent has:

- **Reads**: `moviesList`, `showsList`, `mediaChannelsList`, `tmdbSearch`, `tmdbTvSearch`, `youtubeSearch`
- **Writes** (all batch tools taking arrays): `adminMediaMoviesAddFromTmdb`, `adminMediaMoviesUpsert`, `adminMediaMoviesDelete`,
  `adminMediaShowsAddFromTmdb`, `adminMediaShowsUpsert`, `adminMediaShowsDelete`, `adminMediaChannelsUpsert`, `adminMediaChannelsDelete`.
  There is no `moviesMarkWatched` tool — marking watched is a `adminMediaMoviesUpsert` with `status: watched` and `watchedAt` set.
  `toolMoviesUpsert` hand-builds its Zod item schema (Gemini's structured decoding rejects `z.date()`, so `watchedAt` rides the wire as an
  ISO string and `execute` converts with `new Date(...)`); `toolShowsUpsert` and `toolMediaChannelsUpsert` reuse the generated
  `GqlS*InputSchema()` (no DateTime fields).
- **Snapshot**: `mediaSnapshotForAgent()` renders a compact markdown list of every movie + series + channel with ids inline, embedded in the
  sub-agent's system prompt so the LLM can lift ids without a list call for common asks

Because every write is a batch, the sub-agent batches same-shape work into a single call — one `adminMediaMoviesUpsert` for N edits, one
`adminMediaMoviesAddFromTmdb` for a whole set of adds (each TMDB fetch runs in parallel). A common "add three films I saw" ask is **two tool
calls, not six**: one `tmdbSearch` per title to resolve ids (or a single batched intent) followed by one `adminMediaMoviesAddFromTmdb`
carrying all three. Ids for follow-up edits come from the add result's `referenceIds` (input order) earlier in the same turn.

Mutation-log entries flow back to the orchestrator as `MediaAgentMutation` (kinds: `movieAdd`, `movieUpdate`, `movieDelete`, `showAdd`,
`showUpdate`, `showDelete`, `mediaChannelAdd`, `mediaChannelUpdate`, `mediaChannelDelete`), each populated per-input from a batch, with `id`
and `title` so the orchestrator can narrate specific rows and produce deep-links.

### Deep linking from the assistant

The orchestrator's system prompt teaches these link templates (see `agentPersonalAssistant.ts`):

- Movie → `[<title>](/workspace/media?tab=movies&focus=<movieId>)`
- Series → `[<title>](/workspace/media?tab=series&focus=<showId>)`
- YouTube channel → `[<name>](/workspace/media?tab=youtube&focus=<channelId>)`
- Podcast → `[<name>](/workspace/media?tab=podcasts&focus=<channelId>)`

The media page reads `?focus=<id>` on mount, switches to the tab that owns the id when needed, and scrolls the matching row into view with a
brief highlight ring.

### Cross-view: `/workspace/software`

`software.tsx` runs `Admin.adminMediaFindOne.adminMediaChannelFindMany(topic: "tech")` at load time and renders a "Favourite tech channels"
section with avatar + name + handle + platform icon rows. Read-only there — all edits happen on `/workspace/media`. Adding this section to
any other workspace area (e.g. a future `/workspace/movies-inbox` for film critics) is one small graphql file plus one component; the
`topics` axis composes.

### Where things live

| Concern                     | File                                                                                                                                                                                                                                                                                                 |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tables + types              | `src/server/db/schema.ts` (`movies`, `shows`, `mediaChannels`, `movieStatuses`, `mediaPlatforms`, `mediaTopics`)                                                                                                                                                                                     |
| Migrations                  | `drizzle/0017_violet_giant_man.sql`, `drizzle/0023_uneven_johnny_blaze.sql`                                                                                                                                                                                                                          |
| Mappers                     | `src/server/mappers/toGqlAdminMediaMovie.ts`, `toGqlAdminMediaShow.ts`, `toGqlAdminMediaChannel.ts`                                                                                                                                                                                                  |
| Queries                     | `src/server/queries/adminMediaMovieFindMany.ts`, `adminMediaShowFindMany.ts`, `adminMediaChannelFindMany.ts`                                                                                                                                                                                         |
| Commands                    | `src/server/commands/movies{Upsert,Delete,AddFromTmdb}.ts`, `shows{Upsert,Delete,AddFromTmdb}.ts`, `mediaChannels{Upsert,Delete}.ts`, `adminMediaChannelReorder.ts`                                                                                                                                  |
| TMDB client                 | `src/server/services/tmdbClientCreate.ts` (wired into `ServerRuntime.tmdb`)                                                                                                                                                                                                                          |
| YouTube client              | `src/server/services/youtubeClientCreate.ts` (wired into `ServerRuntime.youtube`)                                                                                                                                                                                                                    |
| Resolver wiring             | `src/server/graphql/resolversCreate.ts` (`Admin.adminMediaFindOne`, `AdminMediaQuery`, and the media `AdminMutation` handlers)                                                                                                                                                                       |
| Page (UI)                   | `src/routes/{-$locale}/workspace/media.tsx`                                                                                                                                                                                                                                                          |
| Client ops                  | `src/routes/{-$locale}/workspace/media.graphql`                                                                                                                                                                                                                                                      |
| Cross-view (software)       | `src/routes/{-$locale}/workspace/software.tsx` + `software.graphql`                                                                                                                                                                                                                                  |
| Assistant sub-agent + tools | `src/server/agents/agentPersonalAssistantMedia.ts`, `mediaSnapshotForAgent.ts`, `toolDelegateToMedia.ts`, `toolMovies*`, `toolShows*`, `toolMediaChannels*`, `toolMoviesList.ts`, `toolShowsList.ts`, `toolMediaChannelsList.ts`, `toolTmdbSearch.ts`, `toolTmdbTvSearch.ts`, `toolYoutubeSearch.ts` |
| Orchestrator wiring         | `src/server/agents/agentPersonalAssistant.ts` (registers `delegateToMedia` + adds deep-link templates for movies / series / YouTube / podcasts)                                                                                                                                                      |

## Out of scope

- **Season / episode tracking.** Series track completed + next-season timing only. A `Seasons` / `Episodes` cascade (or per-episode watched
  state) is deferred until that level of detail is worth the schema cost.
- **Local poster caching.** Posters ride TMDB's CDN via the cached URL. If TMDB rotates a URL or drops an image, the row shows the fallback
  poster tile. A future refresh job could re-fetch metadata for stale rows.
- **Multiple posters per title.** One `posterUrl` is enough; a join table for backdrop alternates is deferred.
- **Rating notes / review markdown.** The `notes` column takes free-form text; a proper markdown-rendered review is a follow-up that could
  reuse the same rendering pipe the projects notes use.
- **Public showcase.** Every media surface is `noindex` and admin-only. If a "what I watched in 2027" post ever ships publicly, it will be a
  static export of the `AdminMediaMovie` / `AdminMediaShow` tables into a markdown page, not a live public route.
