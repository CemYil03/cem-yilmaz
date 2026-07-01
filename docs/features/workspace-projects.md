# Workspace projects: Inbox + Projects

A single workspace surface at `/workspace/projects` for project-shaped work: incoming visitor briefs (Inbox) and ongoing personal projects
(Projects board). Standalone todos live on their own surface at [/workspace/todos](./workspace-todos.md) and never mix into this page.

See also:

- [features/workspace-todos.md](./workspace-todos.md) — standalone tasks (rows with `projectId IS NULL`).
- [features/project-requests.md](./project-requests.md) — the OTP-gated visitor flow that produces the rows the Inbox tab triages.
- [architecture/content-model.md](../architecture/content-model.md) — the DB-backed editable-list pattern this feature follows.
- [features/cv.md](./cv.md) — the canonical admin-editor implementation the projects UI mirrors.

## User behavior

The page has two tabs, switched via a `?tab=inbox|projects` search param (defaults to `projects` so deep-links from the hub land on the
daily-work surface). A legacy `?tab=todos` link on the loader hot-redirects to `/workspace/todos` so any pre-split bookmark or stale
assistant message still resolves.

- **Inbox** — every `ProjectRequest` whose visitor verified their email but Cem hasn't triaged yet. Each row shows the visitor, project
  type, submission date, and (on expand) the full brief plus budget/timeline. Two actions: **Archive** flips the request to `archived`
  without creating a project; **Convert to project** opens the project editor inline, prefilled with a title of
  `<project-type-label>: <company-or-name>`, description copied from the brief, and Budget / Timeline / Contact lines pre-pasted into
  `notes`. The admin reviews, edits anything they want, and on save the editor's normal `projectUpsert` mutation creates the project in the
  chosen status and archives the source request in the same transaction. A toggle reveals archived rows. Rows already converted are filtered
  out of the default view (they're visible on the linked Project as a "Source request" backlink instead).
- **Projects** — responsive **tile grid** (1 column on mobile, 2 on `md`, 3 on `lg+`) grouped by project status
  (`idea | planning | active | paused | done | archived`). Each tile carries title, short description (clamped to 2 lines), source-request
  backlink when applicable, a tasks-done counter (`3/7`), and a total-work label. The **whole tile is a link** to the project detail route —
  no inline edit / delete / start-timer affordances; those all live on the detail page. When this project owns the running timer the tile
  picks up a live `HH:MM:SS` badge in the header corner and a primary-tinted ring so the active project is glanceable on the grid. Tasks
  themselves are listed and edited on the detail route — the board no longer expands them inline.

Each project tile on the **Projects** tab also surfaces a **live-timer badge** when this project owns the running timer; full timer controls
(start / stop / switch) live on the project detail route — see
[Project activity timeline & work timer](#project-activity-timeline--work-timer).

The workspace hub's Projects card carries a small primary-coloured badge with the un-triaged inbox count, so the count is visible without
opening the page.

## Options considered

| Approach                                                                       | Why we picked / didn't                                                                                                                                                                                               |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Triage on a dedicated `/workspace/project-requests` page**                   | Splits the same mental space into two routes. The Inbox tab pattern is the same shape as Visitor-chats list-or-detail but bound to the page Cem actually lives in.                                                   |
| **One unified `Item` table with a `kind` column** (request \| project \| task) | Saves one or two table definitions, costs a constraint on every read. The lifecycle and the writable fields of a `ProjectRequest` are different enough from a `Project` that the union obscures more than it shares. |
| **Markdown file per project in `FileUploads`**                                 | Simple but loses the kanban + task-progress views. No structured query — every "what am I doing right now" answer becomes a regex.                                                                                   |
| **Dedicated `Projects` + `Tasks` tables** (chosen)                             | Mirrors CV's DB-backed pattern. Status is filterable; tasks are countable. Markdown notes still live in `Projects.notes` for free-form context.                                                                      |
| **Tasks table with required `projectId`** + separate todos table               | Two near-identical schemas. A nullable `projectId` is one column and one tab condition; it stays one table.                                                                                                          |

## Option chosen

Dedicated `Projects` and `Tasks` tables. `Tasks.projectId` is nullable — `IS NULL` rows are standalone todos surfaced on the separate
`/workspace/todos` page (see [features/workspace-todos.md](./workspace-todos.md)); this page never lists them so the two mental spaces stay disjoint. Convert
flow runs through `projectUpsert` with `sourceRequestId` set; a single drizzle transaction inserts the project, stamps
`Projects.sourceRequestId`, and archives the request. Single-language (English only) — the page is admin-only and never surfaced publicly,
so the `*De` / `*En` pairing the CV uses would cost typing without buying anything.

## Implementation details

### Database schema

`Projects`:

- `projectId uuid PK`
- `title varchar` required, single-line summary
- `description text` short summary surfaced on cards (nullable)
- `notes text` long-form markdown for the row (nullable; rendered as plain text in v1)
- `status varchar` (`idea | planning | active | paused | done | archived`), default `idea`
- `position int` for ordering within a status column
- `sourceRequestId uuid` FK → `ProjectRequests.projectRequestId`, `ON DELETE SET NULL` — converted projects keep existing even if the source
  request is later deleted
- `startedAt`, `completedAt` nullable `timestamptz` — driven by the editor, not auto-stamped on status change in v1
- `createdAt`, `updatedAt`
- Indexes: `(status, position)` covers the board's primary scan; `(sourceRequestId)` powers the Inbox's "already converted" filter

`Tasks`:

- `taskId uuid PK`
- `projectId uuid` FK → `Projects.projectId`, `ON DELETE CASCADE` — nullable for standalone todos
- `title varchar`, `notes text`
- `status varchar` (`todo | doing | done`), default `todo`
- `position int` per `(projectId, status)` bucket
- `dueAt`, `completedAt` nullable `timestamptz`
- `createdAt`, `updatedAt`
- Indexes: `(projectId, position)` for the inline task list under a project; `(status, dueAt)` for future "what's overdue" queries

Migration: `drizzle/0004_secret_butterfly.sql`.

### GraphQL

Read namespace under `Admin` (reached via `currentSession.user.admin`):

- `admin.projectRequests(status: ProjectRequestStatus): [ProjectRequest!]!` — list (newest first); `convertedProject` field joined in
- `admin.projectRequestsInboxCount: Int!` — count of `emailVerified` requests without a linked project, drives the hub badge
- `admin.projects(status: ProjectStatus): [Project!]!` — board feed; eagerly loads `tasks` + `sourceRequest`
- `admin.standaloneTasks: [Task!]!` — full list of standalone todos. Consumed by [/workspace/todos](./workspace-todos.md), not this page.
- `admin.standaloneOpenTaskCount: Int!` — hub-badge count of standalone todos in `todo` or `doing`.

Write namespace under `AdminMutation` (gated by `guardAdminMutation`):

- `projectRequestArchive(projectRequestId)`, `projectRequestDelete(projectRequestId)`
- `projectUpsert(input)` — single entry point for both hand-authored projects and conversions from an inbox request. When `input.projectId`
  is absent it creates; when present it updates. When `input.sourceRequestId` is also set on a create the resolver loads the source request
  inside the same transaction, requires it to be `emailVerified`, links the new project back via `sourceRequestId`, and flips the request to
  `archived`. The visitor's brief lives in `input.description` / `input.notes` because the inbox UI prefills the editor from the request
  before the admin submits; no synthesis happens server-side. `input.position` is optional on create — when omitted the row lands at the end
  of the `planning` column (max position + 1).
- `projectDelete(projectId)`, `projectReorder(orderedIds)`
- `taskUpsert(input)`, `taskDelete(taskId)`, `taskReorder(orderedIds)` — reorder is bucket-scoped at the call site (caller passes a single
  status column's worth of ids).

### Where things live

| Concern         | File                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Tables + types  | `src/server/db/schema.ts` (`projects`, `tasks`, `project*Status*`, `task*Status*`)                                             |
| Migration       | `drizzle/0004_secret_butterfly.sql`                                                                                            |
| Mappers         | `src/server/mappers/toGqlProjectRequest.ts`, `toGqlProject.ts`, `toGqlTask.ts`                                                 |
| Queries         | `src/server/queries/projectRequestsList.ts`, `projectRequestsInboxCount.ts`, `projectsList.ts`, `standaloneTasksList.ts`       |
| Commands        | `src/server/commands/projectRequest{Archive,Delete}.ts`, `project{Upsert,Delete,Reorder}.ts`, `task{Upsert,Delete,Reorder}.ts` |
| Resolver wiring | `src/server/graphql/resolversCreate.ts`                                                                                        |
| Page (UI)       | `src/routes/{-$locale}/workspace/projects.tsx`                                                                                 |
| Client ops      | `src/routes/{-$locale}/workspace/projects.graphql`                                                                             |
| Hub badge       | `src/routes/{-$locale}/workspace/index.tsx` + `index.graphql`                                                                  |
| Tests           | `src/server/commands/projectUpsert.test.ts`, `taskReorder.test.ts`                                                             |

## Out of scope (v1)

- **Drag reorder.** Cards use status select; task position adjusts via the underlying mutation when a task is created but no visual drag
  handle. The `*Reorder` mutations exist and are tested — wiring the same drag affordance the CV page uses is a follow-up.
- **AI summarization** of an Inbox request before conversion. Phase-2 candidate for the personal-assistant agent.
- **Cross-status drag** on the projects board.
- **Public `/projects/$id`** detail pages — separate Phase 3 deliverable.

## Detail route

The kanban board lives at `/workspace/projects`; clicking a tile opens `/workspace/projects/$projectId` (filename
`projects_.$projectId.tsx`). The board renders a tile grid grouped by status — each tile is a single link with title, short description,
source-request backlink, task counter, total-work label, and a live-timer badge when this project owns the running timer. All other actions
(edit / delete / start-stop timer / task management / activity log) live on the detail page.

The detail route has its own search-param schema (`?tab=overview|tasks|activity|notes|links|files&focus=<id>`) and a single GraphQL query
(`WorkspaceProjectDetail`) co-located in `projects_.$projectId.graphql`. The query mirrors the board's nested shape but adds `links` /
`files` per project and per activity, the new offer columns (`amountCents`, `offerStatus`), and is fetched by
`admin.project(projectId: ID!)` — a new single-entity counterpart to `admin.projects`. The board page's own GraphQL file no longer needs to
ship the per-project activity-edit mutations (the detail page owns those); only `projectTimerStart` / `projectTimerStop` and the
project-level CRUD stayed.

### Layout

The page is a two-column grid on `lg+` (`minmax(0,1fr) 320px`); both columns stack on smaller widths. A `ProjectTitleBlock` spans both
columns at the top: large display title, status pill underneath, and the source-request chip alongside.

The **left column** is a single `GlassCard` containing the description and the tab strip. Description renders through `AssistantMarkdown`
(`src/web/components/AssistantMarkdown.tsx`) so paragraphs, lists, and emphasis are visible — no wall of text. A ghost `Edit` button reveals
on hover at the top-right of the description; clicking swaps the block to an in-place `Textarea` + Save / Cancel. The tab strip has six
entries with **Overview as the default** (visiting `/workspace/projects/<id>` with no `?tab` lands there):
`overview · tasks · activity · notes · links · files`.

The **right column** is a sticky rail (`lg:sticky lg:top-24`) wrapped in `GlassCard`. From top to bottom:

1. **Primary action** — full-width Start / Stop / Switch timer button. While running, the button becomes a single chip showing the live
   `HH:MM:SS` counter plus a "Stopp" affordance.
2. **`⋯` action menu** — `DropdownMenu` containing `Notizen bearbeiten` (deep-links to the Notes tab) and a destructive `Projekt löschen`.
   Delete is intentionally **behind the menu** so it can't be hit by a stray click near the primary timer button.
3. **Metadata list** — `Erstellt`, `Aktualisiert` (relative when fresh, absolute otherwise), optional `Gestartet` / `Abgeschlossen`,
   `Arbeitszeit` (live total — `TotalWorkLabel` ticks while the timer runs), `Aufgaben X/Y` with a thin primary-tinted progress bar,
   `Aktivitäten` count.
4. **Source-request panel** — only present when the project was converted from an inbox brief. Name, email (mailto), company, type, budget,
   timeline as compact label / value rows.

### Status pill

The pill is a `DropdownMenu` trigger styled per status — six color classes covering both themes (idea → muted, planning → amber, active →
emerald, paused → secondary, done → primary, archived → muted/strikethrough). The menu items call the same `projectUpsert` mutation the
former `Select` did. Source of truth lives in `PROJECT_STATUS_TINTS` at the top of the route file.

### Overview tab

The Overview tab is the glance surface — it surfaces only sections that have content (never a wall of empty states):

- **Up next** — top 3 open tasks (todo first, then doing, sorted by `dueAt nulls last`). Clicking a row deep-links to the Tasks tab with
  `?focus=<taskId>`.
- **Letzte Aktivität / Recent activity** — last 5 entries with their kind icons. The header has a `Verlauf ansehen →` deep-link.
- **Angepinnt / Pinned** — the pinned links and files chips that used to sit above the tab strip. They now have a home; the pre-tab pinned
  rail is gone.
- **Notizen** — first 400 chars of `notes` rendered through `AssistantMarkdown` (clamped to 4 lines).

A truly empty project gets a single welcoming card with two CTAs (`Aufgabe anlegen` / `Verlauf öffnen`) instead of all of the above.

### Empty states

Every dedicated tab (Aufgaben, Verlauf, Links, Dateien) shows an `EmptyState` block when the list is empty: a faint Lucide icon, a one-line
bilingual prompt, and a primary action button that opens the existing form. Source: the module-scope `EmptyState` helper in the route file.
The Notes textarea is always rendered; its placeholder carries the welcoming line.

### Activity timeline (chat layout)

The Activity tab renders as a chat-style timeline. Each row carries a `direction` column (`outgoing | incoming | internal`) that drives the
layout:

- **`outgoing`** — right-aligned bubble with a primary tint. The default for `meeting` and `offer` rows; the typical "I sent this" turn.
- **`incoming`** — left-aligned bubble with a neutral tint. The default for `clientContact` rows; the typical "client said this" turn.
- **`internal`** — centered system row. Set by the server (regardless of what the client sent) for `work`, `note`, and `milestone` kinds.
  Work-timer rows collapse to a single line ("Du hast 1 h 15 m gearbeitet · 14:30") with an expand-on-click chevron — they're measurements,
  not turns, so they don't shout. Note and milestone rows render expanded.

The feed reads newest-at-bottom (chat convention). A centered day-separator pill marks day boundaries (`Montag, 14. März 2026`). The
composer sits below the feed, mirroring `/workspace/assistant`.

The activity composer surfaces a **Richtung / Direction** picker only for `clientContact`, `meeting`, and `offer` — the kinds where
direction is a real choice. Switching kind auto-snaps direction to the kind-appropriate default (`clientContact` → incoming, `meeting` /
`offer` → outgoing); manual override sticks after that.

The schema:

- `ProjectActivities.direction varchar NOT NULL DEFAULT 'internal'` — backfilled by migration `drizzle/0010_grey_blindfold.sql`:
  pre-existing `clientContact` rows became `incoming`, `meeting` and `offer` became `outgoing`, everything else (`work` / `note` /
  `milestone`) is `internal`.
- Enum: `projectActivityDirections = ['outgoing', 'incoming', 'internal']` in `src/server/db/schema.ts`.
- GraphQL: `enum ProjectActivityDirection` + `direction: ProjectActivityDirection!` on the type + optional `direction` on
  `ProjectActivityCreate`. The `projectActivityUpsert` command normalizes `work` / `note` / `milestone` to `internal` regardless of what the
  client sent.

### Breadcrumb / chrome

The detail route has no in-page back-link. The way back to the board is the workspace header's breadcrumb trail, where the intermediate
`projects` crumb collapses to its `FolderKanban` icon (label kept for screen readers) and links to `/workspace/projects`. The trailing crumb
renders the project's **title**, not its id — `WorkspaceHeader` pulls it off the active route's loader data via a small selector keyed by
route id (see `TRAILING_LABEL_SELECTORS` in `src/web/components/WorkspaceHeader.tsx`). While the loader is resolving the label is empty
(just the icon shows) rather than briefly flashing the UUID. Long titles truncate with an ellipsis so the chat button and trail stay on one
line.

Deep linking from the assistant carries over: `?focus=<id>` matches against `data-row-id` on tasks, activities, links, and files. A focused
row scrolls into view and flashes for ~1500 ms, then the param drops via replace-navigate.

## Links

Project links are external URLs the project accumulates: GitHub repo, Malt mission, Figma file, client portal, shared drive, invoice page.
Each row carries a `kind` enum (`github | malt | figma | gdrive | notion | invoice | offer | other`) that drives the icon, an optional
`label` (falls back to the URL host), and a `pinned` flag (drives the header rail surfacing).

A link is optionally **born from an activity**: when the user logs a "sent offer" activity entry and attaches a link in the same form,
`projectLinks.activityId` is stamped with the new activity's id. Deleting the activity later cascade-set-nulls the link — the resource
survives, it just detaches from the timeline. Adding a link directly on the Links tab leaves `activityId` null.

Database: `ProjectLinks` table — `projectLinkId`, `projectId` (FK, cascade), `activityId` (FK, set-null), `url`, `label`, `kind`, `pinned`,
`createdAt`, `updatedAt`. Indexes `(projectId, pinned)` and `(activityId)`.

GraphQL: `type ProjectLink`, `enum ProjectLinkKind`, mutations `projectLinkUpsert`, `projectLinkDelete`, `projectLinkTogglePin`.
`Project.links` and `ProjectActivity.links` are eagerly loaded by `projectsList` / `projectGet` in the same in-memory normalization pass.

## Files

Project files reuse the shared `FileUploads` store (see [architecture/file-storage.md](../architecture/file-storage.md)). The client uploads
the bytes via `POST /api/file-uploads` first (same flow the chat composer uses), then calls `projectFileUpsert` with the returned
`fileUploadId`. The detail page's Files tab and the inline "+ file" affordance on the activity composer share the same upload helper
(`src/web/chat/fileUpload.ts`).

A `ProjectFiles` row carries `projectId`, `activityId` (nullable, set-null on activity delete — same semantics as links), `fileUploadId` (FK
to `fileUploads`, cascade), `label`, `kind` (`offer | invoice | contract | screenshot | other`), and `pinned`. On project delete the join
rows cascade away; the underlying `FileUploads` row is preserved (it may still be reachable from a chat message), and the user-row cascade
reclaims storage when the owner goes. If we later want eager cleanup of orphan uploads, do it in `projectFileDelete` after confirming no
other reference exists.

GraphQL: `type ProjectFile { fileUpload: FileUpload! ... }`, `enum ProjectFileKind`, mutations `projectFileUpsert`, `projectFileDelete`,
`projectFileTogglePin`.

### Inline preview

The Files tab opens images, markdown, and text-ish formats inline via the same `ChatAttachmentPreviewDialog` the chat surface uses
(`src/web/components/chat-message/ChatAttachmentPreviewDialog.tsx`). Dispatch is shared through `previewKindFor`
(`src/web/chat/chatAttachmentPreview.ts`): markdown renders through `<AssistantMarkdown />`, other text-ish formats land in a `<pre>`,
images max-out at 70vh. Anything else (PDF, archives) keeps the previous behaviour — clicking the filename opens the bytes in a new tab. The
dialog is hoisted on `FilesSection`, so arrow keys walk the full list of files in their on-screen order.

### Agent-authored markdown

The projects sub-agent has a `projectFileCreate` tool (`src/server/agents/toolProjectFileCreate.ts`) that produces a markdown document
directly from the chat — no upload step. The agent supplies `markdown`, `filename` (`.md`), `kind`, optional `label` / `pinned`, and the
server command (`src/server/commands/projectFileCreateFromMarkdown.ts`) writes the bytes to `FileUploads` with `mediaType = 'text/markdown'`
and links the row through `projectFileUpsert`. Scope is intentionally narrow: markdown only and create-only. PDFs, edits, and re-uploads
still go through the browser path so the call sites stay auditable.

## Atomic attach on activity create

`projectActivityUpsert` accepts optional `attachLinkUrl` / `attachFileUploadId` (with companion `attachLinkKind` / `attachFileKind` / labels
/ pin flags). When set on a create, the server runs the activity insert plus the matching `projectLinks` / `projectFiles` insert in one
transaction. Lets the UI offer a single "+ link" / "+ file" toggle on the activity composer without forcing the client to chain two
round-trips. The fields are ignored on update — edit the resource rows through their own mutations.

## Offer tracking

`kind = 'offer'` activity rows pick up two new columns: `amountCents` (integer cents in EUR; single-currency assumption in v1) and
`offerStatus` (`sent | accepted | rejected | withdrawn`). The editor surfaces an amount field and a status select only when `kind = offer`;
the server rejects non-null values on any other kind. Renders as a coloured pill on the timeline. A withdrawn offer keeps the row for
history.

## Out of scope (still v1.x)

- **Drag reorder** on the kanban board.
- **AI summarization** of an Inbox request before conversion.
- **Cross-status drag** on the projects board.
- **Public `/projects/$id`** detail pages — separate Phase 3 deliverable. The workspace detail route (admin-only, noindex) is unrelated.
- **Cross-project totals / reports.** No "this month" view yet.
- **Per-task time totals.** `taskId` link is captured but not yet surfaced as "time spent on task X".
- **Editing work-row metadata.** The timer mutations write the row; today there is no way to retitle a finished work session.
- **Orphan upload cleanup** when a project file is deleted. Today the underlying `FileUploads` row stays around until the user cascade
  reclaims it; a v1.1 cleanup could delete the blob if no other reference exists.

## Assistant control

The personal assistant at `/workspace/assistant` can read and mutate this board on Cem's instruction. It delegates project/task work to a
dedicated sub-agent (`agentPersonalAssistantProjects`) whose tools wrap the same `projectUpsert` / `projectDelete` / `taskUpsert` /
`taskDelete` / `projectActivityUpsert` / `projectLinkUpsert` commands the page uses, plus `projectFileCreate` for agent-authored markdown
files (see the **Files → Agent-authored markdown** section above). See
[architecture/agent-delegation.md](../architecture/agent-delegation.md).

### Deep linking from the assistant

The orchestrator formats every project / inbox row it names as a markdown link with a `?focus=<id>` search param —
`/workspace/projects?tab=projects&focus=<projectId>` and `…&tab=inbox&focus=<projectRequestId>`. Standalone todos deep-link to
`/workspace/todos?focus=<taskId>` instead (see [features/workspace-todos.md](./workspace-todos.md)). The page's `validateSearch` schema picks `focus` up, a
`useEffect` scrolls the `<li data-row-id="<id>">` for the active tab into view, and `@keyframes focus-flash` in `src/styles.css` runs a
single primary-tinted breath for ~1500ms before the param is dropped via a replace-navigate so a refresh doesn't re-flash. Missing or
wrong-tab ids no-op silently. See [Deep links](../architecture/agent-delegation.md#deep-links).

## Project activity timeline & work timer

A project's "history" is more than its tasks. Cem's typical flow is: a client writes on Malt → he sends a first offer → the client
re-contacts via the site's AI chat → a call happens → an email lands → a revised offer goes out. Some of those moments have a duration (the
call, the offer-drafting block); most are just timestamps with a sentence of context. The activity timeline captures all of them in one
chronological stream per project, and the work timer feeds the same stream from the other end — pressing **Start** anywhere puts a running
`kind = 'work'` row on the project's timeline, pressing **Stop** stamps its duration, and the project's `Total` pill rolls everything up.

### Model

One unified `ProjectActivities` table backs both shapes. The same row covers a logged event (a 12-minute call) and a timed work session (75
minutes of offer writing); only the columns that are populated differ.

| Column        | Purpose                                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------------------------- |
| `kind`        | `clientContact \| meeting \| work \| offer \| milestone \| note` — drives the icon, label, and timer ownership    |
| `channel`     | nullable `malt \| email \| phone \| videoCall \| inPerson \| aiAssistant \| other` — only set for contact/meeting |
| `title`       | one-line summary, always required                                                                                 |
| `notes`       | freeform                                                                                                          |
| `occurredAt`  | when it happened; the timeline sorts on this column                                                               |
| `startedAt`   | set on `kind = 'work'` rows; equals `occurredAt`                                                                  |
| `endedAt`     | null while a timer is running                                                                                     |
| `durationSec` | cached `endedAt - startedAt`, written on stop; settable directly on event rows to log a known duration            |
| `taskId`      | optional link to a specific `Task` for finer-grained reporting later                                              |

A partial unique index `(kind) WHERE endedAt IS NULL AND kind = 'work'` enforces the **one global active timer** invariant at the DB level —
even if two tabs race a Start, only one row can exist. The `projectTimerStart` command runs inside a transaction that first stops the open
row then inserts the new one, so the invariant holds without ever surfacing a unique-violation to the user.

### Unified stream vs. two tables

A separate `ProjectTimeEntry` table would have split the timeline into two parallel feeds — events on one, timed sessions on the other — and
made every "total time and history" view a UNION. Folding both into `ProjectActivities` keeps the timeline a single
`ORDER BY occurredAt DESC` and lets `kind` decide the rendering. The cost is a few null columns on event rows; the win is that a card-level
timer button and the event log share the same code path.

### GraphQL

Read additions on `Admin`:

- `Project.activities: [ProjectActivity!]!` — newest first.
- `Project.totalWorkSec: Int!` — sum of `durationSec` over `kind = 'work'` rows. Running timers contribute 0 server-side; the client adds
  the live seconds for the currently-running timer.
- `admin.activeTimer: ProjectActivity` — the one running timer, or null.

Mutations on `AdminMutation`:

- `projectActivityUpsert(input)` — for event-style rows. Rejects `kind = 'work'` so the timer mutations stay the only path into a work row.
- `projectActivityDelete(activityId)`.
- `projectTimerStart(projectId, taskId, title)` — atomically stops any running timer, then inserts the new one. Default title is
  `Work session`.
- `projectTimerStop(activityId)` — stamps `endedAt = now`, computes `durationSec`. Idempotent on an already-stopped row.

### UI

Each project tile on the **Projects** tab carries:

- A **live-timer badge** in the header corner — when this project owns the running timer it shows a live HH:MM:SS counter (ticking
  client-side from `startedAt`) plus a primary-tinted ring around the tile. The badge is non-interactive; start / stop / switch happen on
  the project detail route.
- A **task progress** chip (`3/7`) in the footer.
- A **Total** label in the footer — `formatDuration(totalWorkSec + liveSeconds)` so the number ticks while the timer runs.

The activity-timeline strip and the start / stop / switch timer controls live on the project detail route, not on the board tile.

### Out of scope (v1)

- **Cross-project totals / reports.** No "this month" view yet — every roll-up lives on its project card.
- **Subscriptions.** The active-timer state is read on page load and after every mutation; a tab open for hours without interaction re-syncs
  on the next refetch. A `PubSubPostgres` channel can be added if multi-device sync becomes a need.
- **Per-task time totals.** The `taskId` link is captured but not yet surfaced as "time spent on task X". The data is there for when it is.
- **Editing work-row metadata.** The timer mutations write the row; today there is no way to retitle a finished work session through the UI.
  A `projectActivityUpdateWorkMeta` mutation can land when needed without touching duration math.

Files:

- Table + types: `src/server/db/schema.ts` (`projectActivities`, `projectActivityKinds`, `projectActivityChannels`, `projectOfferStatuses`)
- Migration: `drizzle/0005_chunky_switch.sql` (original); `drizzle/0007_fat_stature.sql` (links, files, offer columns)
- Mapper: `src/server/mappers/toGqlProjectActivity.ts`, `toGqlProjectLink.ts`, `toGqlProjectFile.ts`, `toGqlFileUpload.ts`, and the extended
  `toGqlProject.ts`
- Queries: `src/server/queries/activeTimerGet.ts`, `projectGet.ts`; lists + totals + links + files are loaded by `projectsList.ts`
- Commands: `src/server/commands/projectActivityUpsert.ts` (with atomic attach), `projectActivityDelete.ts`, `projectTimerStart.ts`,
  `projectTimerStop.ts`, `projectLink{Upsert,Delete,TogglePin}.ts`, `projectFile{Upsert,Delete,TogglePin}.ts`,
  `projectFileCreateFromMarkdown.ts`
- Agent tools: `src/server/agents/toolProject{sList,Upsert,Delete,LinkUpsert,ActivityUpsert,FileCreate}.ts`, `toolTask{Upsert,Delete}.ts`,
  `toolStandaloneTasksList.ts`
- Tests: `src/server/commands/projectTimerStart.test.ts`, `projectLinkUpsert.test.ts`, `projectFileUpsert.test.ts`,
  `projectFileCreateFromMarkdown.test.ts`, `projectActivityUpsert.test.ts`
- Resolver wiring: `src/server/graphql/resolversCreate.ts`
- UI: board card in `src/routes/{-$locale}/workspace/projects.tsx`; detail route + tabs + pinned rail in
  `src/routes/{-$locale}/workspace/projects_.$projectId.tsx`; operations in `projects.graphql` (board) and `projects_.$projectId.graphql`
  (detail)
