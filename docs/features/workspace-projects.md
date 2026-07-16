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

- **Inbox** — every `AdminProjectRequest` whose visitor verified their email but Cem hasn't triaged yet. Each row shows the visitor, project
  type, submission date, and (on expand) the full brief plus budget/timeline. Two actions: **Archive** flips the request to `archived`
  without creating a project; **Convert to project** opens the project editor inline, prefilled with a title of
  `<project-type-label>: <company-or-name>`, description copied from the brief, and Budget / Timeline / Contact lines pre-pasted into
  `notes`. The admin reviews, edits anything they want, and on save the editor's normal `adminProjectsUpsert` mutation (a one-element array)
  creates the project in the chosen status and archives the source request in the same transaction. A toggle reveals archived rows. Rows
  already converted are filtered out of the default view (they're visible on the linked Project as a "Source request" backlink instead).
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

| Approach                                                                                     | Why we picked / didn't                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Triage on a dedicated `/workspace/project-requests` page**                                 | Splits the same mental space into two routes. The Inbox tab pattern is the same shape as Visitor-chats list-or-detail but bound to the page Cem actually lives in.                                                             |
| **One unified `AdminInventoryItem` table with a `kind` column** (request \| project \| task) | Saves one or two table definitions, costs a constraint on every read. The lifecycle and the writable fields of a `AdminProjectRequest` are different enough from a `AdminProject` that the union obscures more than it shares. |
| **Markdown file per project in `FileUploads`**                                               | Simple but loses the kanban + task-progress views. No structured query — every "what am I doing right now" answer becomes a regex.                                                                                             |
| **Dedicated `AdminProject` + `AdminProjectTask` tables** (chosen)                            | Mirrors CV's DB-backed pattern. Status is filterable; tasks are countable. Markdown notes still live in `AdminProject.notes` for free-form context.                                                                            |
| **Tasks table with required `projectId`** + separate todos table                             | Two near-identical schemas. A nullable `projectId` is one column and one tab condition; it stays one table.                                                                                                                    |

## Option chosen

Dedicated `AdminProject` and `AdminProjectTask` tables. `AdminProjectTask.projectId` is nullable — `IS NULL` rows are standalone todos
surfaced on the separate `/workspace/todos` page (see [features/workspace-todos.md](./workspace-todos.md)); this page never lists them so
the two mental spaces stay disjoint. Convert flow runs through `adminProjectsUpsert` with `sourceRequestId` set on the row; a single drizzle
transaction inserts the project, stamps `AdminProject.sourceRequestId`, and archives the request. Single-language (English only) — the page
is admin-only and never surfaced publicly, so the `*De` / `*En` pairing the CV uses would cost typing without buying anything.

## Implementation details

### Database schema

`AdminProject`:

- `projectId uuid PK`
- `title varchar` required, single-line summary
- `description text` short summary surfaced on cards (nullable)
- `notes text` long-form markdown for the row (nullable; rendered as plain text in v1)
- `status varchar` (`idea | planning | active | paused | done | archived`), default `idea`
- `position int` for ordering within a status column
- `sourceRequestId uuid` FK → `AdminProjectRequest.projectRequestId`, `ON DELETE SET NULL` — converted projects keep existing even if the
  source request is later deleted
- `startedAt`, `completedAt` nullable `timestamptz` — driven by the editor, not auto-stamped on status change in v1
- `createdAt`, `updatedAt`
- Indexes: `(status, position)` covers the board's primary scan; `(sourceRequestId)` powers the Inbox's "already converted" filter

`AdminProjectTask`:

- `taskId uuid PK`
- `projectId uuid` FK → `AdminProject.projectId`, `ON DELETE CASCADE` — nullable for standalone todos
- `title varchar`, `notes text`
- `status varchar` (`backlog | blocked | todo | doing | done`), default `todo`
- `position int` per `(projectId, status)` bucket
- `dueAt`, `completedAt` nullable `timestamptz`
- `createdAt`, `updatedAt`
- Indexes: `(projectId, position)` for the inline task list under a project; `(status, dueAt)` for future "what's overdue" queries

Migration: `drizzle/0004_secret_butterfly.sql`.

### GraphQL

Read namespace under `Admin` (reached via `sessionFindOne.user.admin`):

- `admin.adminProjectRequestFindMany(status: AdminProjectRequestStatus): [AdminProjectRequest!]!` — list (newest first); `convertedProject`
  field joined in
- `admin.adminProjectRequestInboxCount: Int!` — count of `emailVerified` requests without a linked project, drives the hub badge
- `admin.adminProjectFindMany(status: AdminProjectStatus): [AdminProject!]!` — board feed; eagerly loads `tasks` + `sourceRequest`
- `admin.adminStandaloneTaskFindMany: [AdminProjectTask!]!` — full list of standalone todos. Consumed by
  [/workspace/todos](./workspace-todos.md), not this page.
- `admin.adminStandaloneTaskOpenCount: Int!` — hub-badge count of standalone todos in `todo` or `doing`.

Write namespace under `AdminMutation` (gated by `guardAdminMutation`). Every entity mutation is a **batch** returning
`MutationResult { success, referenceId, referenceIds }` — never the hydrated entity. The `userUpdates` subscription is the single source of
truth; `referenceIds` echoes the row id per input in input order so a caller can address a newly-created row without a follow-up read. A
single-item edit passes a one-element array — there is no parallel singular path.

- `adminProjectRequestArchive(projectRequestId)`, `adminProjectRequestDelete(projectRequestId)` — admin-queue singulars, intentionally not
  batched.
- `adminProjectsUpsert(projects: [AdminProjectCreate!]!)` — single entry point for both hand-authored projects and conversions from an inbox
  request, processed per input row. When a row's `projectId` is absent it creates; when present it updates. When `sourceRequestId` is also
  set on a create the command loads the source request inside the same transaction, requires it to be `emailVerified`, links the new project
  back via `sourceRequestId`, and flips the request to `archived`. The visitor's brief lives in `description` / `notes` because the inbox UI
  prefills the editor from the request before submit; no synthesis happens server-side. `position` is optional on create — when omitted the
  row lands at the end of the `planning` column. The planning tail is read once before the loop and incremented locally so a batch of
  creates lays out contiguously.
- `adminProjectsDelete(projectIds: [ID!]!)`, `adminProjectReorder(orderedIds)`
- `adminProjectTasksUpsert(tasks: [AdminProjectTaskCreate!]!)`, `adminProjectTasksDelete(taskIds: [ID!]!)`,
  `adminProjectTaskReorder(orderedIds)` — reorder is bucket-scoped at the call site (caller passes a single status column's worth of ids).

### Where things live

| Concern         | File                                                                                                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tables + types  | `src/server/db/schema.ts` (`projects`, `tasks`, `project*Status*`, `task*Status*`)                                                                                                                                  |
| Migration       | `drizzle/0004_secret_butterfly.sql`                                                                                                                                                                                 |
| Mappers         | `src/server/mappers/toGqlAdminProjectRequest.ts`, `toGqlAdminProject.ts`, `toGqlAdminProjectTask.ts`                                                                                                                |
| Queries         | `src/server/queries/adminProjectRequestFindMany.ts`, `adminProjectRequestInboxCount.ts`, `adminProjectFindMany.ts`, `adminProjectFindOne.ts`, `adminProjectFileContentFindOne.ts`, `adminStandaloneTaskFindMany.ts` |
| Commands        | `src/server/commands/projectRequest{Archive,Delete}.ts`, `projects{Upsert,Delete}.ts`, `adminProjectReorder.ts`, `tasks{Upsert,Delete}.ts`, `adminProjectTaskReorder.ts`                                            |
| Resolver wiring | `src/server/graphql/resolversCreate.ts`                                                                                                                                                                             |
| Page (UI)       | `src/routes/{-$locale}/workspace/projects.tsx`                                                                                                                                                                      |
| Client ops      | `src/routes/{-$locale}/workspace/projects.graphql`                                                                                                                                                                  |
| Hub badge       | `src/routes/{-$locale}/workspace/index.tsx` + `index.graphql`                                                                                                                                                       |
| Tests           | `src/server/commands/adminProjectsUpsert.test.ts`, `adminProjectTaskReorder.test.ts`                                                                                                                                |

## Out of scope (v1)

- **Drag reorder on the projects board.** Project _tiles_ use a status select; project position adjusts via the underlying mutation but has
  no visual drag handle. (Task cards on the detail route's Tasks tab **do** support drag-and-drop between status columns — see
  [Tasks tab](#tasks-tab).) The `*Reorder` mutations exist and are tested — wiring drag on the project board is a follow-up.
- **AI summarization** of an Inbox request before conversion. Phase-2 candidate for the personal-assistant agent.
- **Cross-status drag** on the projects board (moving a _project_ between status groups by drag).
- **Public `/projects/$id`** detail pages — separate Phase 3 deliverable.

## Detail route

The kanban board lives at `/workspace/projects`; clicking a tile opens `/workspace/projects/$projectId` (filename
`projects_.$projectId.tsx`). The board renders a tile grid grouped by status — each tile is a single link with title, short description,
source-request backlink, task counter, total-work label, and a live-timer badge when this project owns the running timer. All other actions
(edit / delete / start-stop timer / task management / activity log) live on the detail page.

The detail route has its own search-param schema (`?tab=overview|tasks|activity|notes|links|files&focus=<id>&taskView=kanban|list`) and a
single GraphQL query (`WorkspaceProjectDetail`) co-located in `projects_.$projectId.graphql`. The query mirrors the board's nested shape but
adds `links` / `files` per project and per activity, the new offer columns (`amountCents`, `offerStatus`), and is fetched by
`admin.project(projectId: ID!)` — a new single-entity counterpart to `admin.projects`. The board page's own GraphQL file no longer needs to
ship the per-project activity-edit mutations (the detail page owns those); only `adminProjectTimersStart` / `adminProjectTimersStop` and the
project-level CRUD stayed.

### Layout

The page is a **full-width single column**. The section-tab bar is the **first thing on the page** — title, status, description, and the
timer/metadata rail all moved _inside_ the Overview tab, so the tab strip is the primary switcher and every tab body spans the full width.
The tab strip uses the canonical underlined-tab pattern (see [conventions.md](../conventions.md#top-of-page-sub-view-switcher)). The tab
strip has six entries with **Overview as the default** (visiting `/workspace/projects/<id>` with no `?tab` lands there):
`overview · tasks · activity · notes · links · files`.

### Status pill

The pill is a `DropdownMenu` trigger styled per status — six color classes covering both themes (idea → muted, planning → amber, active →
emerald, paused → secondary, done → primary, archived → muted/strikethrough). The menu items call the same `adminProjectsUpsert` mutation
the former `Select` did (a one-element array). Source of truth lives in `PROJECT_STATUS_TINTS` at the top of the route file.

### Overview tab

The Overview tab is the project's **cockpit** — identity chrome plus the timer, laid out so the most-used affordances are one glance away:

- **Title block** — large display title, status pill underneath (see [Status pill](#status-pill)), source-request chip alongside. Moved here
  from the old full-width header.
- **Description** — renders through `AssistantMarkdown` (`src/web/components/AssistantMarkdown.tsx`) so paragraphs, lists, and emphasis are
  visible. A ghost `Edit` button reveals on hover at the top-right; clicking swaps the block to an in-place `Textarea` + Save / Cancel.
- Below that, a two-column grid on `lg+` (`minmax(0,1fr) 320px`, stacking on mobile): the **glance column** on the left and the **timer /
  metadata rail** on the right (`lg:sticky lg:top-24`). The rail lives **only** on Overview now — every other tab is full-width.

The **glance column** surfaces only sections that have content (never a wall of empty states):

- **Up next** — top 3 open tasks (todo first, then doing, sorted by `dueAt nulls last`). Clicking a row deep-links to the Tasks tab with
  `?focus=<taskId>`.
- **Letzte Aktivität / Recent activity** — last 5 entries with their kind icons. The header has a `Verlauf ansehen →` deep-link.
- **Angepinnt / Pinned** — the pinned links and files chips.
- **Notizen** — first 400 chars of `notes` rendered through `AssistantMarkdown` (clamped to 4 lines).

A truly empty project shows a single welcoming card with two CTAs (`Aufgabe anlegen` / `Verlauf öffnen`) in the glance column instead of the
sections above; the title block and rail still render.

The **rail** (`ProjectRail`, wrapped in `GlassCard`), top to bottom:

1. **Primary action** — full-width Start / Stop / Switch timer button. While running, the button becomes a single chip showing the live
   `HH:MM:SS` counter plus a "Stopp" affordance.
2. **`⋯` action menu** — `DropdownMenu` containing `Notizen bearbeiten` (deep-links to the Notes tab) and a destructive `Projekt löschen`.
   Delete is intentionally **behind the menu** so it can't be hit by a stray click near the primary timer button.
3. **Metadata list** — `Erstellt`, `Aktualisiert` (relative when fresh, absolute otherwise), optional `Gestartet` / `Abgeschlossen`,
   `Arbeitszeit` (live total — `TotalWorkLabel` ticks while the timer runs), `Aufgaben X/Y` with a thin primary-tinted progress bar,
   `Aktivitäten` count.
4. **Source-request panel** — only present when the project was converted from an inbox brief. Name, email (mailto), company, type, budget,
   timeline as compact label / value rows.

### Tasks tab

Tasks carry a five-value status, displayed left→right as `backlog · blocked · todo · doing · done`
(`Backlog · Blockiert · Offen · Aktiv · Erledigt`). `backlog` is the not-yet-committed holding column; `blocked` is work waiting on
something external. The enum is a plain `varchar` (see [content-model](../architecture/content-model.md)), so adding these two values needed
no migration — only the `taskStatuses` const in `schema.ts`, the GraphQL enum, a codegen run, and the exhaustive `TASK_STATUS_*` maps in the
detail page and the shared [todos](./workspace-todos.md) page.

The tab offers **two views**, toggled by a compact list/kanban button group next to "Add task" and persisted in a `?taskView=kanban|list`
search param (list is the default → the key drops from the URL). This secondary control is a two-button group, not another underlined
`<nav>` — the tab strip is the page's single top-of-page switcher (see [conventions.md](../conventions.md#top-of-page-sub-view-switcher)).

- **List view** (`TasksList`) — the classic status-grouped stacks, iterating all five statuses; a bucket renders only when non-empty, with a
  colored status dot and count in its heading. Rows reuse `TaskRow` (three-state checkbox cycle, inline edit/delete).
- **Kanban view** (`TasksKanban`) — one droppable column per status, left→right in `TASK_STATUS_ORDER`, each with a tinted header chip and
  count. Cards are **draggable** (native HTML5 drag — same primitives as the CV reorder list in `cv.tsx`, no DnD library). Dropping a card
  on a column moves it to that status via the existing `WorkspaceProjectDetailUpsertTask` mutation: the card appends to the end of the
  target column (`position = max + 1`, collision-free with the single-task upsert), and dropping onto **Done** stamps `completedAt` (cleared
  when dragged back off Done). The move is optimistic locally, then reconciled by the `userUpdates` subscription via an
  `(id, status, position)` signature check. Empty columns show a dashed "Drop here" placeholder. Drag feedback is opacity + a ring on the
  hovered column — no motion-required animation. The card stays intentionally minimal — no grip icon, no hover edit/delete buttons; a plain
  **click (or Enter/Space) opens the inline edit form** (`role="button"`), which is where edit and delete live.

### Empty states

Every dedicated tab (Aufgaben, Verlauf, Links, Dateien) shows an `EmptyState` block when the list is empty: a faint Lucide icon, a one-line
bilingual prompt, and a primary action button that opens the existing form. Source: the module-scope `EmptyState` helper in the route file.
The Notes textarea is always rendered; its placeholder carries the welcoming line.

### Activity timeline (chat layout)

The Activity tab renders as a chat-style timeline in a **fixed-height pane** (`WorkspaceProjectActivityTimeline` in
`src/web/components/WorkspaceProjectActivityTimeline.tsx`). Each row carries a `direction` column (`outgoing | incoming | internal`) that
drives the layout:

- **`outgoing`** — right-aligned bubble with a primary tint (`Bubble tone="outgoing"`). The default for `meeting` and `offer` rows; the
  typical "I sent this" turn.
- **`incoming`** — left-aligned bubble with a neutral, **opaque** tint (`Bubble tone="neutral"` — opaque so it stays readable over the
  workspace's ambient backdrop, where the assistant tone's translucency washed out). The default for `clientContact` rows; the typical
  "client said this" turn.
- **`internal`** — centered system row. Set by the server (regardless of what the client sent) for `work`, `note`, and `milestone` kinds,
  **and for any row on the `videoCall` channel** — a video call is a shared moment that belongs to neither side, so it renders centered like
  a note rather than picking a from-who side. Work-timer rows collapse to a single line ("Du hast 1 h 15 m gearbeitet · 14:30") with an
  expand-on-click chevron — they're measurements, not turns, so they don't shout. Note and milestone rows render expanded.

The bubbles reuse the app's **shared chat primitives** (`MessageRow` / `Bubble` in `src/web/components/chat-message/shared.tsx`) rather than
re-implementing message chrome — the same components the assistant and visitor transcripts use. `Bubble` gained an opaque `neutral` tone and
a primary-tinted `outgoing` tone (plus an optional `className`), and `MessageRow` gained a `center` side, for exactly these rows.

The feed reads newest-at-bottom (chat convention). A centered day-separator pill (`WorkspaceProjectActivityDaySeparator`) marks day
boundaries (`Montag, 14. März 2026`).

#### No title — one free-form body

There is **no title field**. Manual entries carry a single free-form summary that lands in `notes`; `AdminProjectActivity.title` is nullable
(migration `drizzle/0032_mysterious_tyrannus.sql` drops the `NOT NULL`) and left null by the composer. Timer rows (`"Work session"`) and
agent-authored rows may still set a title, and the edit form preserves an existing title untouched — it just isn't a manual concept. Rows
render their `title` when present and fall back to the kind (or channel) label as the heading otherwise, so a titleless note still reads as
something in glance views (`activityHeading()` in the route file).

#### Fixed-height pane + bottom composer

The Activity tab is a **fixed-height chat pane**, mirroring `/workspace/assistant`: a `flex flex-col` column sized to the viewport
(`h-[calc(100dvh-…)]`, the route drops the tab's bottom padding so the pane fits exactly). The **feed scrolls internally** through the
shared `ChatTranscriptShell` (`src/web/components/base/chat-transcript-shell.tsx`) — it inherits the anchor-at-bottom open position and the
jump-to-latest pill for free — and the **composer parks as the non-scrolling bottom flex child**, so it can't drift on desktop or mobile the
way the earlier `sticky bottom-0` version did.

The composer (`WorkspaceProjectActivityComposer` in `src/web/components/WorkspaceProjectActivityComposer.tsx`) reuses the shared
`InputGroup` / `InputGroupTextarea` message-composer surface: a free-form textarea with **Enter to send** (Shift+Enter for a newline) and a
`SendIcon` submit button. After a successful add it resets in place for the next entry. Editing an existing row happens **inline** above the
feed (the bottom composer is add-only); the inline form swaps the send button for Cancel / Save.

Link and file attachments are **quiet icon buttons** in the composer's bottom addon (a `LinkIcon` toggles an inline URL field, a
`PaperclipIcon` opens the file picker) rather than the full-width labelled panels they used to be. An attached file shows as a small
removable chip in the composer's top addon. The `kind` selectors for link/file were dropped from the composer — attachments default to
`other` and can be recategorised on the Links / Files tabs.

The Activity cluster lives in its own prefixed component files under `src/web/components/` — `WorkspaceProjectActivityTimeline.tsx` (the
pane + feed), `WorkspaceProjectActivityMessage.tsx` (the bubble / centered rows + day separator), `WorkspaceProjectActivityComposer.tsx`
(the add/edit form), and `WorkspaceProjectActivityConstants.ts` (the activity labels, icons, and helpers, a few of which the route's
Overview tab re-imports) — rather than inline in the route file.

#### Smart fields

The composer only shows fields that make sense for the current selection:

- **Channel** — only for `clientContact` / `meeting`.
- **Direction** — only for `clientContact` / `meeting` / `offer`, and **hidden when the channel is `videoCall`** (shared → always
  centered/internal, so there's no side to pick).
- **Duration** — only for a live conversation with a length: `meeting`, or a channelled contact on `phone` / `videoCall` / `inPerson`. Async
  channels (Malt messages, email, AI chat) hide it (`DURATION_CHANNELS` in the route file). So e.g. **Kundenkontakt → Malt** shows no
  duration field.
- **Amount / offer status** — only for `offer`.

#### Date-time picker

`occurredAt` is captured with a **`DateTimePicker`** (`src/web/components/base/date-time-picker.tsx`) — a popover calendar with a
`<input type="time">` in the footer, so a single control captures the full timestamp (a call "started at 14:30 today"), not just the day.
Selecting a day preserves the time-of-day and vice versa.

The schema:

- `AdminProjectActivity.direction varchar NOT NULL DEFAULT 'internal'` — backfilled by migration `drizzle/0010_grey_blindfold.sql`:
  pre-existing `clientContact` rows became `incoming`, `meeting` and `offer` became `outgoing`, everything else (`work` / `note` /
  `milestone`) is `internal`.
- Enum: `projectActivityDirections = ['outgoing', 'incoming', 'internal']` in `src/server/db/schema.ts`.
- GraphQL: `enum AdminProjectActivityDirection` + `direction: AdminProjectActivityDirection!` on the type + optional `direction` on
  `AdminProjectActivityCreate`. The `adminProjectActivitiesUpsert` command normalizes `work` / `note` / `milestone` to `internal` regardless
  of what the client sent, and also normalizes **any row on the `videoCall` channel** to `internal` (the shared-moment rule;
  `resolveDirection` takes the channel as its second argument).

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

Database: `AdminProjectLink` table — `projectLinkId`, `projectId` (FK, cascade), `activityId` (FK, set-null), `url`, `label`, `kind`,
`pinned`, `createdAt`, `updatedAt`. Indexes `(projectId, pinned)` and `(activityId)`.

GraphQL: `type AdminProjectLink`, `enum AdminProjectLinkKind`, batch mutations `adminProjectLinksUpsert` (pin toggles ride this — pass the
existing row with `pinned` flipped), `adminProjectLinksDelete`. `AdminProject.links` and `AdminProjectActivity.links` are eagerly loaded by
`adminProjectFindMany` / `adminProjectFindOne` in the same in-memory normalization pass.

## Files

Project files reuse the shared `FileUploads` store (see [architecture/file-storage.md](../architecture/file-storage.md)). The client uploads
the bytes via `POST /api/file-uploads` first (same flow the chat composer uses), then calls `adminProjectFilesUpsert` with the returned
`fileUploadId`. The detail page's Files tab and the inline "+ file" affordance on the activity composer share the same upload helper
(`src/web/chat/fileUpload.ts`).

A `AdminProjectFile` row carries `projectId`, `activityId` (nullable, set-null on activity delete — same semantics as links), `fileUploadId`
(FK to `fileUploads`, cascade), `label`, `kind` (`offer | invoice | contract | screenshot | other`), and `pinned`. On project delete the
join rows cascade away; the underlying `FileUploads` row is preserved (it may still be reachable from a chat message), and the user-row
cascade reclaims storage when the owner goes. If we later want eager cleanup of orphan uploads, do it in `adminProjectFilesDelete` after
confirming no other reference exists.

GraphQL: `type AdminProjectFile { fileUpload: FileUpload! ... }`, `enum AdminProjectFileKind`, batch mutations `adminProjectFilesUpsert`
(pin toggles ride this — pass the existing row with `pinned` flipped), `adminProjectFilesDelete`.

### Drop zone

The Files-tab upload form (`FileUploadForm` in `projects_.$projectId.tsx`) is a dashed-border drop zone rather than a raw
`<input type="file">`. Clicking it opens the OS file picker; dragging a file over it flips the border and background to the brand ring and
inline copy switches to "Drop file here" / "Datei hier ablegen". Once a file is picked the zone shows filename + size and "Click or drop to
replace". The visual state and drag-depth counter follow the same pattern as `MessageComposer.tsx` so the highlight stays stable while the
cursor crosses child elements. Only single-file selection is supported here — activity attachments still use the compact "+ file" button on
the composer.

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
and links the row directly (an inline insert + mapper). Scope is intentionally narrow: markdown only and create-only. PDFs, edits, and
re-uploads still go through the browser path so the call sites stay auditable.

## Atomic attach on activity create

`adminProjectActivitiesUpsert` accepts optional `attachLinkUrl` / `attachFileUploadId` (with companion `attachLinkKind` / `attachFileKind` /
labels / pin flags). When set on a create, the server runs the activity insert plus the matching `projectLinks` / `projectFiles` insert in
one transaction. Lets the UI offer a single "+ link" / "+ file" toggle on the activity composer without forcing the client to chain two
round-trips. The fields are ignored on update — edit the resource rows through their own mutations.

## Offer tracking

`kind = 'offer'` activity rows pick up two new columns: `amountCents` (integer cents in EUR; single-currency assumption in v1) and
`offerStatus` (`sent | accepted | rejected | withdrawn`). The editor surfaces an amount field and a status select only when `kind = offer`;
the server rejects non-null values on any other kind. Renders as a coloured pill on the timeline. A withdrawn offer keeps the row for
history.

## Out of scope (still v1.x)

- **Drag reorder of the project tiles** on the projects board (moving a project between status groups by drag). Task cards on the detail
  route's Tasks-tab kanban **are** draggable between status columns; only fine-grained _within-column_ ordering (a dropped card appends to
  the column's end) remains a follow-up.
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
dedicated sub-agent (`agentPersonalAssistantProjects`) whose tools wrap the same `adminProjectsUpsert` / `adminProjectsDelete` /
`adminProjectTasksUpsert` / `adminProjectTasksDelete` / `adminProjectActivitiesUpsert` / `adminProjectLinksUpsert` batch commands the page
uses, plus `projectFileCreate` for agent-authored markdown files (see the **Files → Agent-authored markdown** section above). The
sub-agent's tools are plural batch tools: it is instructed to batch every same-shape write into one call — one `adminProjectTasksUpsert` for
all of them, not N calls — and to source ids from the board snapshot in its system prompt or from a prior tool result's `referenceIds` (in
input order) earlier in the same turn. There are no timer tools; the sub-agent does not run timers. See
[architecture/agent-delegation.md](../architecture/agent-delegation.md).

### Read tools

The system prompt embeds a compact board snapshot (`projectsSnapshotForAgent.ts`) — projects grouped by status with per-project task counts,
plus the standalone-todo list. That covers "what projects do I have?" without a tool call. Three read tools go deeper:

- `projectsList` (`toolProjectsList.ts`, wraps `adminProjectFindMany`) — every project with its children joined. Used when the sub-agent
  needs task ids/statuses across the board.
- `projectGet` (`toolProjectGet.ts`, wraps `adminProjectFindOne`) — **one** project with its tasks, activity timeline, links, and file
  metadata. This is how the sub-agent answers questions about a specific project's history or its attachments without pulling the whole
  board. The snapshot has no activities, so this tool (or `projectsList`) is required to see them.
- `projectFileContentGet` (`toolProjectFileContentGet.ts`, wraps `adminProjectFileContentFindOne`) — decodes an attached file's bytes to a
  UTF-8 `content` string so the sub-agent can read a document body (offer, brief, note, contract) before summarizing or revising it. The
  query scopes the join to the requesting admin's `fileUploads.userId`, so a guessed or other-user id reads as not-found. Text/markdown
  files return `readable: true` + `content`; binary files (PDF, images) return `readable: false` + the download `url` — the agent points Cem
  at the link rather than reading bytes. Mirrors the standalone-docs `workspaceFileGet` decode. There is no in-place file edit: to change a
  markdown file the sub-agent reads it here, then re-creates it via `projectFileCreate`.

### Deep linking from the assistant

The orchestrator formats every project / inbox row it names as a markdown link with a `?focus=<id>` search param —
`/workspace/projects?tab=projects&focus=<projectId>` and `…&tab=inbox&focus=<projectRequestId>`. Standalone todos deep-link to
`/workspace/todos?focus=<taskId>` instead (see [features/workspace-todos.md](./workspace-todos.md)). The page's `validateSearch` schema
picks `focus` up, a `useEffect` scrolls the `<li data-row-id="<id>">` for the active tab into view, and `@keyframes focus-flash` in
`src/styles.css` runs a single primary-tinted breath for ~1500ms before the param is dropped via a replace-navigate so a refresh doesn't
re-flash. Missing or wrong-tab ids no-op silently. See [Deep links](../architecture/agent-delegation.md#deep-links).

## Project activity timeline & work timer

A project's "history" is more than its tasks. Cem's typical flow is: a client writes on Malt → he sends a first offer → the client
re-contacts via the site's AI chat → a call happens → an email lands → a revised offer goes out. Some of those moments have a duration (the
call, the offer-drafting block); most are just timestamps with a sentence of context. The activity timeline captures all of them in one
chronological stream per project, and the work timer feeds the same stream from the other end — pressing **Start** anywhere puts a running
`kind = 'work'` row on the project's timeline, pressing **Stop** stamps its duration, and the project's `Total` pill rolls everything up.

### Model

One unified `AdminProjectActivity` table backs both shapes. The same row covers a logged event (a 12-minute call) and a timed work session
(75 minutes of offer writing); only the columns that are populated differ.

| Column        | Purpose                                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------------------------- |
| `kind`        | `clientContact \| meeting \| work \| offer \| milestone \| note` — drives the icon, label, and timer ownership    |
| `channel`     | nullable `malt \| email \| phone \| videoCall \| inPerson \| aiAssistant \| other` — only set for contact/meeting |
| `title`       | nullable one-line heading — set by timer / agent rows; manual entries leave it null and use `notes`               |
| `notes`       | freeform                                                                                                          |
| `occurredAt`  | when it happened; the timeline sorts on this column                                                               |
| `startedAt`   | set on `kind = 'work'` rows; equals `occurredAt`                                                                  |
| `endedAt`     | null while a timer is running                                                                                     |
| `durationSec` | cached `endedAt - startedAt`, written on stop; settable directly on event rows to log a known duration            |
| `taskId`      | optional link to a specific `AdminProjectTask` for finer-grained reporting later                                  |

A partial unique index `(kind) WHERE endedAt IS NULL AND kind = 'work'` enforces the **one global active timer** invariant at the DB level —
even if two tabs race a Start, only one row can exist. The `adminProjectTimersStart` command runs inside a transaction that first stops the
open row then inserts the new one, so the invariant holds without ever surfacing a unique-violation to the user.

### Unified stream vs. two tables

A separate `ProjectTimeEntry` table would have split the timeline into two parallel feeds — events on one, timed sessions on the other — and
made every "total time and history" view a UNION. Folding both into `AdminProjectActivity` keeps the timeline a single
`ORDER BY occurredAt DESC` and lets `kind` decide the rendering. The cost is a few null columns on event rows; the win is that a card-level
timer button and the event log share the same code path.

### GraphQL

Read additions on `Admin`:

- `AdminProject.activities: [AdminProjectActivity!]!` — newest first.
- `AdminProject.totalWorkSec: Int!` — sum of `durationSec` over `kind = 'work'` rows. Running timers contribute 0 server-side; the client
  adds the live seconds for the currently-running timer.
- `admin.activeTimer: AdminProjectActivity` — the one running timer, or null.

Mutations on `AdminMutation`:

- `adminProjectActivitiesUpsert(projectActivities)` — for event-style rows. Rejects `kind = 'work'` so the timer mutations stay the only
  path into a work row. One-shot `attachLink*` / `attachFile*` extensions are honoured per create row.
- `adminProjectActivitiesDelete(activityIds)`.
- `adminProjectTimersStart(inputs: [AdminProjectTimerStartInput!]!)` — kept separate from the activity upsert because the clock semantics
  (stop-open-timer + `startedAt: now`) are distinct. Each input atomically stops any running timer, then inserts the new one; a
  multi-element batch ends with only the last row open, respecting the single-active-timer index. `referenceIds` carries the new
  `activityId` per input. Default title is `Work session`.
- `adminProjectTimersStop(activityIds)` — stamps `endedAt = now`, computes `durationSec` per id. Idempotent on an already-stopped row (left
  untouched); throws if an id does not exist.

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
- Migration: `drizzle/0005_chunky_switch.sql` (original); `drizzle/0007_fat_stature.sql` (links, files, offer columns);
  `drizzle/0032_mysterious_tyrannus.sql` (drops `title` `NOT NULL`)
- Mapper: `src/server/mappers/toGqlAdminProjectActivity.ts`, `toGqlAdminProjectLink.ts`, `toGqlAdminProjectFile.ts`, `toGqlFileUpload.ts`,
  and the extended `toGqlAdminProject.ts`
- Queries: `src/server/queries/adminProjectActiveTimerFindOne.ts`, `adminProjectFindOne.ts`, `adminProjectFileContentFindOne.ts`; lists +
  totals + links + files are loaded by `adminProjectFindMany.ts`
- Commands: `src/server/commands/adminProjectActivitiesUpsert.ts` (with atomic attach), `adminProjectActivitiesDelete.ts`,
  `adminProjectTimersStart.ts`, `adminProjectTimersStop.ts`, `projectLinks{Upsert,Delete}.ts`, `projectFiles{Upsert,Delete}.ts`,
  `projectFileCreateFromMarkdown.ts` (the one intentional non-batch survivor — returns a hydrated entity for the sub-agent tool's mutation
  log), `projectFileCreateFromMarkdown.ts`
- Agent tools: `src/server/agents/toolProject{Get,sList,sUpsert,sDelete,LinksUpsert,ActivitiesUpsert,FileCreate,FileContentGet}.ts`,
  `toolTasks{Upsert,Delete}.ts`, `toolStandaloneTasksList.ts`
- Tests: `src/server/commands/adminProjectTimersStart.test.ts`, `adminProjectLinksUpsert.test.ts`, `adminProjectFilesUpsert.test.ts`,
  `projectFileCreateFromMarkdown.test.ts`, `adminProjectActivitiesUpsert.test.ts`, `adminProjectsUpsert.test.ts`
- Resolver wiring: `src/server/graphql/resolversCreate.ts`
- UI: board card in `src/routes/{-$locale}/workspace/projects.tsx`; detail route + tabs + pinned rail in
  `src/routes/{-$locale}/workspace/projects_.$projectId.tsx`; the Activity cluster in
  `src/web/components/WorkspaceProjectActivity{Timeline,Message,Composer}.tsx` + `WorkspaceProjectActivityConstants.ts`; shared chat
  primitives in `src/web/components/chat-message/shared.tsx`; operations in `projects.graphql` (board) and `projects_.$projectId.graphql`
  (detail)
