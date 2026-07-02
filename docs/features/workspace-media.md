# Workspace media: Movies + Channels

`/workspace/media` is Cem's private library for two things: a **movie watchlist** (want-to-watch / watching / watched / dropped, with
posters and ratings) and a **favourite-channels list** (YouTube / Twitch / podcast, clustered by topic). The channels list is the single
source of truth for cross-view reads — `/workspace/software` renders the subset tagged `tech` as its "Favourite tech channels" section
without duplicating rows.

See also:

- [architecture/content-model.md](../architecture/content-model.md) — the DB-backed editable-list pattern this feature follows.
- [architecture/agent-delegation.md](../architecture/agent-delegation.md) — the media assistant sub-agent (`delegateToMedia`) wires up
  exactly like `delegateToProjects`.
- [features/workspace-projects.md](./workspace-projects.md) — sibling admin editor with the same shape.
- [features/cv.md](./cv.md) — the canonical seed-and-subscribe editor.

## User behavior

The page has two tabs, switched via a `?tab=movies|channels` search param (defaults to `movies`). A `?focus=<id>` param scrolls the matching
card / row into view and highlights it for a moment — the assistant's deep-links use this.

- **Movies** — sticky **search bar at the top** hits TMDB live (300 ms debounce). Suggestions appear as a dropdown with poster thumbnails;
  clicking one calls `movieAddFromTmdb`, which fetches full detail server-side and inserts the row into Watchlist. A subtle "Add manually"
  link at the bottom of the dropdown opens the empty edit dialog for films TMDB has never heard of. Cards sit in a responsive **poster-first
  grid** (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`), grouped into four sections in this order: Watchlist → Watching →
  Watched → Dropped. Card = poster (2:3 `AspectRatio`) + title + release year, with a rating badge in the top-right corner on watched rows.
  Kebab menu on each card carries the quick actions (Mark watching / Mark watched → rating popover / Move to dropped / Edit / Delete).
  Clicking a card opens a **centered modal dialog** with the full edit form (title, release date via `DatePicker` with
  `captionLayout="dropdown"` for far-past years, runtime, overview, status select, rating, watchedAt, notes textarea, topics multi-select).
- **Channels** — rows **grouped by topic**. A channel with `['tech','ai']` appears under both sections; the client de-duplicates keys per
  section. Row = avatar + name + handle + platform icon + first-line notes preview. Row click opens the same centered-dialog edit surface
  (minus poster). **Drag-reorder within a topic section** rewrites `priority` via `mediaChannelReorder` — HTML5-native drag through the
  shared `useReorderableList` hook, matching the CV pattern. "New channel" button at the top of the tab opens the empty edit dialog. When
  the empty dialog opens with `platform: youtube` (the default), a **YouTube search bar** appears at the top: typing a channel name hits the
  Data API v3 via `youtubeSearch`, and clicking a suggestion auto-fills `name` / `url` / `handle` / `avatarUrl` / `description` in one step
  — same shape as the TMDB flow on the movies tab. Topics and notes stay manual.

Topics on both entities are a **chip input**: known topics (the `MediaTopic` enum) come as suggested chips; free-form values work too (the
column is a plain `text[]`, so ad-hoc topics can be added without a migration). Removing a chip removes it from the array. The known
vocabulary drives the UI autocomplete and the `MediaTopic` GraphQL enum surface.

Filter chips below the search bar narrow the visible grid by topic (`?topic=tech`). Multi-select AND-composes them. The chips are
auto-populated from the union of topics across the visible rows.

## Options considered

| Approach                                                                   | Why we picked / didn't                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **One `Titles` table with a `kind` enum** (movie \| tv \| short)           | Cheapest schema on paper. Loses type-safe TV-specific tracking (episodes, seasons) if TV lands later, and forces every read to filter by `kind` even when the surface only cares about one shape. Deferred until TV arrives.                |
| **Movies + TV shows both in this phase**                                   | Doubles the schema and the UI. TV needs season/episode tracking to be worth doing; not doing it half-baked. The route stays labelled "Movies & TV" so this can grow in a follow-up without a rename.                                        |
| **Local poster storage in `FileUploads`**                                  | Full control, but every add is a manual step and blob storage costs. TMDB's CDN URLs are stable and cache well; storing the URL as a `varchar` is one column instead of a join row.                                                         |
| **No third-party integration** (paste poster URLs by hand)                 | Zero dependencies, poor UX. TMDB gives release date, runtime, and overview for free — a two-keystroke add flow is worth one env var.                                                                                                        |
| **TMDB search + cached URL** (chosen)                                      | Server-side fetch at add-time, stores `tmdbId` + cached URLs + metadata. Cost: one optional env var; graceful degradation when unset (search returns empty, manual add still works).                                                        |
| **Single-topic `varchar` enum** on channels (mirroring `CvSkill.category`) | Strictest. Forces awkward choices for creators who span topics ("Fireship" is both tech and entertainment). One rigid column.                                                                                                               |
| **Multi-topic M2M** (dedicated `MediaTopics` + `MediaChannelTopics` join)  | First M2M in the repo. Overkill unless topics themselves need pages/descriptions. `text[]` covers every current need with `WHERE :topic = ANY(topics)`.                                                                                     |
| **Multi-topic `text[]` on both entities** (chosen)                         | Mirrors `cvExperience.technologies`. A channel can be `['tech','ai']`; a movie can be `['scifi','noir']`. Cross-view reads use `ANY(topics)` — the software page's "tech YouTubers" query is one line. New topics land without a migration. |
| **Dedicated `MediaChannel` ← `SoftwareArea` FK** for cross-referencing     | Duplicates the intent of `topics`. If the reference axis is "these channels are relevant to software", the topic tag already carries that. Cross-section reads via topic scale to future areas (medical, finance) automatically.            |

## Option chosen

Two dedicated tables: `Movies` and `MediaChannels`. Both admin-only (no `*De` / `*En` pairs, same rationale as Projects / Tasks). `topics`
is `text[]` on both — the clustering axis for the media page and the referent for cross-view reads. TMDB is the primary add path; the client
falls through to manual entry when TMDB has no match or `TMDB_API_KEY` is missing.

## Implementation details

### Database schema

`Movies`:

- `movieId uuid PK`
- `title varchar` required
- `tmdbId int` — **unique nullable**, so a re-add of the same TMDB movie updates in place (`movieAddFromTmdb` looks up before inserting),
  while multiple manually-entered rows coexist
- `posterUrl`, `backdropUrl varchar` — cached TMDB CDN URLs; no local blob storage
- `releaseDate date`, `runtimeMinutes int`, `overview text`
- `status varchar` (`watchlist | watching | watched | dropped`), default `watchlist`
- `rating int` — 1..10, admin's own
- `watchedAt timestamptz`, `notes text`
- `topics text[]` — free-form; the `mediaTopics` const array in `schema.ts` is the _known_ vocabulary
- `createdAt`, `updatedAt`
- Indexes: unique on `tmdbId`, `(status)` for the grouped-by-status list

`MediaChannels`:

- `channelId uuid PK`
- `name varchar` required, `platform varchar` (`youtube | twitch | podcast | other`), `url varchar` required
- `handle varchar`, `avatarUrl varchar`, `description text`
- `topics text[]` — clustering axis; same string vocabulary as `Movies.topics`
- `priority int` default 0 — ordering within a topic section, rewritten by `mediaChannelReorder`
- `notes text`, `createdAt`, `updatedAt`
- Index: `(priority)`

Migration: `drizzle/0017_violet_giant_man.sql`.

### GraphQL

Read namespace under `Admin.media` (reached via `currentSession.user.admin.media`):

- `movies: [Movie!]!` — full library; ordered watching → watchlist → watched → dropped, then by `updatedAt DESC`
- `channels: [MediaChannel!]!` — every favourite; ordered by `priority ASC, name ASC`
- `channelsByTopic(topic: String!): [MediaChannel!]!` — filtered via `WHERE :topic = ANY(topics)`; used by `/workspace/software` and any
  future cross-view section
- `tmdbSearch(query: String!): [TmdbMovieResult!]!` — live per-keystroke read; empty on missing key / TMDB error / empty query
- `youtubeSearch(query: String!): [YoutubeChannelResult!]!` — live per-keystroke channel search, same empty-fallback semantics as
  `tmdbSearch`

Write namespace under `AdminMutation` (gated by `guardAdminMutation`):

- `movieUpsert(input)`, `movieDelete(movieId)`
- `movieMarkWatched(movieId, rating)` — shortcut: flips status, stamps `watchedAt`, optional rating
- `movieAddFromTmdb(tmdbId, status)` — fetches TMDB detail server-side, dedupes by `tmdbId`, inserts (or refreshes metadata)
- `mediaChannelUpsert(input)`, `mediaChannelDelete(channelId)`
- `mediaChannelReorder(orderedIds)` — full-array rewrite (same shape as `cvEducationReorder`)

Every command publishes on `userUpdates` after commit, so the media page's `WorkspaceMediaPageUpdates` subscription picks up new state
without a client-side re-fetch.

### TMDB client

`src/server/services/tmdbClientCreate.ts` — thin fetch wrapper around the TMDB v3 REST API. Two entry points on `serverRuntime.tmdb`:

- `searchMovies(query)` → up to 10 hits with title, release date, poster URL, overview
- `getMovie(tmdbId)` → full detail (poster + backdrop + runtime + overview)

`TMDB_API_KEY` is capability-lazy (see `environmentVariablesCreate.ts`). Missing → empty results, never a throw; the media page falls back
to manual entry. 5-second per-request timeout via `AbortSignal.timeout` so a stuck fetch can't block a search keystroke. Image URLs are
resolved to `image.tmdb.org` fully-qualified URLs at the boundary — the frontend never needs TMDB configuration.

### YouTube client

`src/server/services/youtubeClientCreate.ts` — thin fetch wrapper around the YouTube Data API v3. One entry point on
`serverRuntime.youtube`:

- `searchChannels(query)` → up to 10 hits enriched with handle + subscriber count via a follow-up `channels.list` call. Each result carries
  a pre-composed `canonicalUrl` (prefers the `@handle` form, falls back to `/channel/<id>`) so the client can drop it straight into the
  `MediaChannelInput.url` field.

Same posture as the TMDB client: `YOUTUBE_API_KEY` is capability-lazy, missing key → empty results (never a throw), 5-second per-request
timeout. One user search costs two API calls (search 100 units + channels.list 2 units); free-tier quota is 10k units/day which is generous
for a personal library. The channels tab's "New channel" flow uses this to auto-fill name, url, handle, avatarUrl, and description when the
admin picks a match — the rest of the form (topics, notes) stays manual.

### Assistant integration

`agentPersonalAssistantMedia` is the media sub-agent, wired the same way as `agentPersonalAssistantProjects`
([agent-delegation.md](../architecture/agent-delegation.md)). The orchestrator registers `delegateToMedia`; every media ask (add / rate /
list / delete, plus channel management) delegates a natural-language brief that the sub-agent handles with its own tools. The sub-agent has:

- **Reads**: `moviesList`, `mediaChannelsList`, `tmdbSearch`, `youtubeSearch`
- **Writes**: `movieAddFromTmdb`, `movieUpsert`, `movieMarkWatched`, `movieDelete`, `mediaChannelUpsert`, `mediaChannelDelete`
- **Snapshot**: `mediaSnapshotForAgent()` renders a compact markdown list of every movie + channel with ids inline, embedded in the
  sub-agent's system prompt so the LLM can lift ids without a `moviesList` call for common asks

Mutation-log entries flow back to the orchestrator as `MediaAgentMutation` (kinds: `movieAdd`, `movieUpdate`, `movieMarkWatched`,
`movieDelete`, `mediaChannelAdd`, `mediaChannelUpdate`, `mediaChannelDelete`), each with `id` and `title` so the orchestrator can narrate
specific rows and produce deep-links.

### Deep linking from the assistant

The orchestrator's system prompt teaches these link templates (see `agentPersonalAssistant.ts`):

- Movie → `[<title>](/workspace/media?tab=movies&focus=<movieId>)`
- Channel → `[<name>](/workspace/media?tab=channels&focus=<channelId>)`

The media page reads `?focus=<id>` on mount and scrolls the matching row into view with a brief highlight ring.

### Cross-view: `/workspace/software`

`software.tsx` runs `Admin.media.channelsByTopic(topic: "tech")` at load time and renders a "Favourite tech channels" section with avatar +
name + handle + platform icon rows. Read-only there — all edits happen on `/workspace/media`. Adding this section to any other workspace
area (e.g. a future `/workspace/movies-inbox` for film critics) is one small graphql file plus one component; the `topics` axis composes.

### Where things live

| Concern                     | File                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tables + types              | `src/server/db/schema.ts` (`movies`, `mediaChannels`, `movieStatuses`, `mediaPlatforms`, `mediaTopics`)                                                                                                                                                                                                                                                            |
| Migration                   | `drizzle/0017_violet_giant_man.sql`                                                                                                                                                                                                                                                                                                                                |
| Mappers                     | `src/server/mappers/toGqlMovie.ts`, `toGqlMediaChannel.ts`                                                                                                                                                                                                                                                                                                         |
| Queries                     | `src/server/queries/movieList.ts`, `mediaChannelList.ts`, `mediaChannelsByTopic.ts`                                                                                                                                                                                                                                                                                |
| Commands                    | `src/server/commands/movie{Upsert,Delete,MarkWatched,AddFromTmdb}.ts`, `mediaChannel{Upsert,Delete,Reorder}.ts`                                                                                                                                                                                                                                                    |
| TMDB client                 | `src/server/services/tmdbClientCreate.ts` (wired into `ServerRuntime.tmdb`)                                                                                                                                                                                                                                                                                        |
| YouTube client              | `src/server/services/youtubeClientCreate.ts` (wired into `ServerRuntime.youtube`)                                                                                                                                                                                                                                                                                  |
| Resolver wiring             | `src/server/graphql/resolversCreate.ts` (`Admin.media`, `AdminMediaQuery`, and the seven `AdminMutation` handlers)                                                                                                                                                                                                                                                 |
| Page (UI)                   | `src/routes/{-$locale}/workspace/media.tsx`                                                                                                                                                                                                                                                                                                                        |
| Client ops                  | `src/routes/{-$locale}/workspace/media.graphql`                                                                                                                                                                                                                                                                                                                    |
| Cross-view (software)       | `src/routes/{-$locale}/workspace/software.tsx` + `software.graphql`                                                                                                                                                                                                                                                                                                |
| Assistant sub-agent + tools | `src/server/agents/agentPersonalAssistantMedia.ts`, `mediaSnapshotForAgent.ts`, `toolDelegateToMedia.ts`, `toolMovieUpsert.ts`, `toolMovieDelete.ts`, `toolMovieMarkWatched.ts`, `toolMovieAddFromTmdb.ts`, `toolMoviesList.ts`, `toolMediaChannelUpsert.ts`, `toolMediaChannelDelete.ts`, `toolMediaChannelsList.ts`, `toolTmdbSearch.ts`, `toolYoutubeSearch.ts` |
| Orchestrator wiring         | `src/server/agents/agentPersonalAssistant.ts` (registers `delegateToMedia` + adds deep-link templates for movies / channels)                                                                                                                                                                                                                                       |

## Out of scope (v1)

- **TV shows.** The route is labelled "Filme & Serien / Movies & TV" so this can land later without a rename; the schema will grow a `Shows`
  table (with a `Seasons` / `Episodes` cascade) or an extension of `Movies` with a `kind` column depending on what feels less awkward at
  that time.
- **Local poster caching.** Posters ride TMDB's CDN via the cached URL. If TMDB rotates a URL or drops an image, the row shows the fallback
  poster tile. A future refresh job could re-fetch metadata for stale rows.
- **Multiple posters per movie.** One `posterUrl` is enough; a `MoviePosters` join table would be needed for backdrop alternates and is
  deferred.
- **Rating notes / review markdown.** The `notes` column takes free-form text; a proper markdown-rendered review is a follow-up that could
  reuse the same rendering pipe the projects notes use.
- **Public showcase.** Every media surface is `noindex` and admin-only. If a "what I watched in 2027" post ever ships publicly, it will be a
  static export of the `Movies` table into a markdown page, not a live public route.
