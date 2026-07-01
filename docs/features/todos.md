# Workspace todos

A dedicated workspace surface at `/workspace/todos` for standalone tasks — the rows in the `Tasks` table with `projectId IS NULL`. Todos are
quick captures that don't belong to any project: no timer, no activity feed, no lifecycle beyond `todo → doing → done`. Project-bound tasks
live on the project detail route (`/workspace/projects/$projectId`) and never appear here; the two surfaces are disjoint by construction.

See also:

- [features/projects-workspace.md](./projects-workspace.md) — Inbox + Projects board. Shares the `Tasks` table but not the surface.
- [architecture/state-synchronization.md](../architecture/state-synchronization.md) — the seed-and-subscribe pattern this page uses.

## User behavior

Flat list grouped by status (`Offen / Aktiv / Erledigt`). Each row is a title, an optional due date, and a status icon on the left that
cycles `todo → doing → done → todo` on click. Hover reveals edit + delete affordances. **Add todo** opens an inline `TaskForm` (title,
status, optional due date, notes). Empty state: a single card that says "Keine Todos." — no help copy, no CTA duplication; the "Add todo"
button in the header is already there.

Deep-linking from the personal assistant: any standalone task the agent references is formatted as
`[<title>](/workspace/todos?focus=<taskId>)`. The page's search-param schema (`{ focus?: string }`) picks `focus` up, scrolls the matching
`<li data-row-id>` into view, flashes it for ~1500ms, then drops the param. Missing ids no-op silently. See
[Deep links](../architecture/agent-delegation.md#deep-links).

## Options considered

| Approach                                                            | Why we picked / didn't                                                                                                                                                                              |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Todos tab on `/workspace/projects`** (original)                   | Conflated "ongoing project + kanban + timer" with "flat todo list". The mental space is the same word (task) but the workflow isn't; the tab kept the two surfaces glued to one URL for no benefit. |
| **Separate `Todos` table**                                          | Two near-identical schemas. A nullable `projectId` is one column that already carries the distinction.                                                                                              |
| **Dedicated `/workspace/todos` route, same `Tasks` table** (chosen) | Reuses the DB shape; each page owns its own read query so neither has to filter the other out. Legacy `/workspace/projects?tab=todos` links redirect to this route so nothing 404s.                 |

## Option chosen

Dedicated route, same `Tasks` table. `projectId IS NULL` = standalone todo. The page reads only `admin.standaloneTasks` and writes through
`admin.taskUpsert(input: { projectId: null, … })` / `admin.taskDelete`. Project-bound tasks flow through the same commands with a real
`projectId`; the server enforces access via `guardAdminMutation` — nothing on the schema forbids either side from touching the other's rows,
but nothing in the client asks it to.

## Implementation details

### Where things live

| Concern           | File                                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| Page (UI)         | `src/routes/{-$locale}/workspace/todos.tsx`                                                     |
| Client ops        | `src/routes/{-$locale}/workspace/todos.graphql`                                                 |
| Hub tile + badge  | `src/routes/{-$locale}/workspace/index.tsx` + `index.graphql`                                   |
| Redirect (legacy) | `src/routes/{-$locale}/workspace/projects.tsx` `beforeLoad` — `?tab=todos` → `/workspace/todos` |
| Read              | `src/server/queries/standaloneTasksList.ts`, `standaloneOpenTaskCount.ts`                       |
| Write             | Shared with projects — `src/server/commands/task{Upsert,Delete,Reorder}.ts`                     |
| Table + types     | `src/server/db/schema.ts` (`tasks`, `taskStatuses`)                                             |
| Agent tool        | `src/server/agents/toolStandaloneTasksList.ts`                                                  |

### GraphQL

Read namespace (under `Admin`):

- `standaloneTasks: [Task!]!` — full list of `projectId IS NULL` rows, ordered by `position`.
- `standaloneOpenTaskCount: Int!` — `count(*)` of `projectId IS NULL AND status IN ('todo','doing')`. Drives the Todos tile badge on the
  workspace hub.

Write namespace (under `AdminMutation`, gated by `guardAdminMutation`):

- `taskUpsert(input: { taskId?, projectId: null, title!, notes?, status!, position!, dueAt?, completedAt? })` — the page always passes
  `projectId: null`.
- `taskDelete(taskId: ID!)`.

The subscription payload uses the same `WorkspaceTodosPageUser` fragment as the loader query, so mutations that publish `userUpdates`
replace the entire page state in one push — no `router.invalidate()`.

### Hub tile

`PERSONAL_FOCUS_AREAS` on the workspace hub carries a Todos entry with `badgeKey: 'todosOpen'`. The hub loader query pulls
`admin.standaloneOpenTaskCount` and the tile renders it as the same primary-tinted pill the Projects tile uses for its inbox count.

## Out of scope (v1)

- **Drag reorder.** The `taskReorder` mutation exists (used by the CV page pattern) but no visual drag handle yet.
- **AI summarization / bulk-add from natural language.** Personal-assistant candidate.
- **Filtering by due date or tag.** Not needed until the list grows.

## Assistant control

The personal assistant reads standalone todos via `toolStandaloneTasksList` and mutates them through the same `taskUpsert` / `taskDelete`
commands the page uses. See [architecture/agent-delegation.md](../architecture/agent-delegation.md).
