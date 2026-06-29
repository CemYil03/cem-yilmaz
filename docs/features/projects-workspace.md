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
