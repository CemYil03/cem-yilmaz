# Workspace projects: Inbox + Projects + Tasks

A single workspace surface at `/workspace/projects` for everything project-shaped: incoming visitor briefs (Inbox), ongoing personal
projects (Projects board), and standalone todos that don't belong to any project (Todos).

See also:

- [features/project-requests.md](./project-requests.md) — the OTP-gated visitor flow that produces the rows the Inbox tab triages.
- [architecture/content-model.md](../architecture/content-model.md) — the DB-backed editable-list pattern this feature follows.
- [features/cv.md](./cv.md) — the canonical admin-editor implementation the projects UI mirrors.

## User behavior

The page has three tabs, switched via a `?tab=inbox|projects|todos` search param (defaults to `projects` so deep-links from the hub land on
the daily-work surface):

- **Inbox** — every `ProjectRequest` whose visitor verified their email but Cem hasn't triaged yet. Each row shows the visitor, project
  type, submission date, and (on expand) the full brief plus budget/timeline. Two actions: **Archive** flips the request to `archived`
  without creating a project; **Convert to project** opens the project editor inline, prefilled with a title of
  `<project-type-label>: <company-or-name>`, description copied from the brief, and Budget / Timeline / Contact lines pre-pasted into
  `notes`. The admin reviews, edits anything they want, and on save the editor's normal `projectUpsert` mutation creates the project in the
  chosen status and archives the source request in the same transaction. A toggle reveals archived rows. Rows already converted are filtered
  out of the default view (they're visible on the linked Project as a "Source request" backlink instead).
- **Projects** — board grouped by project status (`idea | planning | active | paused | done | archived`). Each card carries title, short
  description, source-request backlink when applicable, and a tasks-done counter (`3/7`). Clicking "Show tasks" reveals an inline task list
  grouped by `todo | doing | done`. Tasks have a checkbox that cycles status (todo → doing → done → todo), an optional due date, and a small
  action menu. Cross-status moves happen by editing the row's status field, not by drag.
- **Todos** — flat task list with the same task primitive, filtered to `projectId IS NULL`. For quick captures that don't (yet) belong to a
  project.

Each project card on the **Projects** tab also opens a **Timeline** strip and a **Timer pill** — both detailed below under
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

Dedicated `Projects` and `Tasks` tables. `Tasks.projectId` is nullable — `IS NULL` rows are standalone todos surfaced on the Todos tab.
Convert flow runs through `projectUpsert` with `sourceRequestId` set; a single drizzle transaction inserts the project, stamps
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

Read namespace under `Admin` (gated by `guardAdmin`):

- `admin.projectRequests(status: ProjectRequestStatus): [ProjectRequest!]!` — list (newest first); `convertedProject` field joined in
- `admin.projectRequestsInboxCount: Int!` — count of `emailVerified` requests without a linked project, drives the hub badge
- `admin.projects(status: ProjectStatus): [Project!]!` — board feed; eagerly loads `tasks` + `sourceRequest`
- `admin.standaloneTasks: [Task!]!` — Todos tab feed

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
- **Attachments.** `FileUploads` is the right home; revisit when the first project needs one.
- **AI summarization** of an Inbox request before conversion. Phase-2 candidate for the personal-assistant agent.
- **Cross-status drag** on the projects board.
- **Public `/projects/$id`** detail pages — separate Phase 3 deliverable.

## Assistant control

The personal assistant at `/workspace/assistant` can read and mutate this board on Cem's instruction. It delegates project/task work to a
dedicated sub-agent (`agentPersonalAssistantProjects`) whose tools wrap the same `projectUpsert` / `projectDelete` / `taskUpsert` /
`taskDelete` commands the page uses. See [architecture/agent-delegation.md](../architecture/agent-delegation.md).

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

Each project card on the **Projects** tab carries:

- A **Timer pill** in the header — when this project owns the running timer it shows a live HH:MM:SS counter (ticking client-side from
  `startedAt`) and clicking it stops; when another project owns the timer it shows a "Switch" hint that re-starts on this project; otherwise
  a small "Start" button.
- A **Timeline** strip below the tasks list, openable from the card footer. Each entry shows a kind icon, the title, the channel chip when
  set, the duration when known, and the `occurredAt` timestamp. Event rows can be edited inline; work rows are owned by the timer and can
  only be deleted.
- A **Total** label in the footer — `formatDuration(totalWorkSec + liveSeconds)` so the number ticks while the timer runs.

### Out of scope (v1)

- **Cross-project totals / reports.** No "this month" view yet — every roll-up lives on its project card.
- **Subscriptions.** The active-timer state is read on page load and after every mutation; a tab open for hours without interaction re-syncs
  on the next refetch. A `PubSubPostgres` channel can be added if multi-device sync becomes a need.
- **Per-task time totals.** The `taskId` link is captured but not yet surfaced as "time spent on task X". The data is there for when it is.
- **Editing work-row metadata.** The timer mutations write the row; today there is no way to retitle a finished work session through the UI.
  A `projectActivityUpdateWorkMeta` mutation can land when needed without touching duration math.

Files:

- Table + types: `src/server/db/schema.ts` (`projectActivities`, `projectActivityKinds`, `projectActivityChannels`)
- Migration: `drizzle/0005_chunky_switch.sql`
- Mapper: `src/server/mappers/toGqlProjectActivity.ts` (and the extended `toGqlProject.ts`)
- Queries: `src/server/queries/activeTimerGet.ts`; activities + totals are loaded by `projectsList.ts`
- Commands: `src/server/commands/projectActivityUpsert.ts`, `projectActivityDelete.ts`, `projectTimerStart.ts`, `projectTimerStop.ts`
- Tests: `src/server/commands/projectTimerStart.test.ts`
- Resolver wiring: `src/server/graphql/resolversCreate.ts`
- UI: timeline + timer pill in `src/routes/{-$locale}/workspace/projects.tsx`; operations in `projects.graphql`
