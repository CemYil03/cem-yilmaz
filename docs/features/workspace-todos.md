# Workspace todos

A dedicated workspace surface at `/workspace/todos` for standalone tasks — the rows in the `Tasks` table with `projectId IS NULL`. Todos are
quick captures that don't belong to any project: no timer, no activity feed, no lifecycle beyond `todo → doing → done`. Project-bound tasks
live on the project detail route (`/workspace/projects/$projectId`) and never appear here; the two surfaces are disjoint by construction.

The surface is small but ritualised — completion is meant to feel earned, momentum is visible, and capture is instant. Both this page and
the project-tasks section on `/workspace/projects/{projectId}` share the redesigned `Task` shape (see
[content-model.md](../architecture/content-model.md#tasks-added-columns)) and the same visual language for the effort strip + when-bucket
chips.

See also:

- [features/workspace-projects.md](./workspace-projects.md) — Inbox + Projects board. Shares the `Tasks` table but not the surface.
- [architecture/state-synchronization.md](../architecture/state-synchronization.md) — the seed-and-subscribe pattern this page uses.

## User behavior

The page is a flat list grouped by status (`Offen / Aktiv / Erledigt`). Each row is a title, an optional due date, and a status icon on the
left that cycles `todo → doing → done → todo` on click. Hover reveals edit + delete affordances. Empty state: a single card that says "Keine
Todos." — no help copy, no CTA duplication; the composer at the top is already there.

### Momentum header

Always visible at the top of the page. Two lines:

1. `3 heute erledigt · 2 offen` — completed count first (reframes the surface from "what's left" to "what I've done").
2. Seven dots — one per day, oldest → newest. Each dot's size scales with that day's completion count (empty = hollow ring, 1 = small, 2 =
   medium, 3+ = full). Today pulses softly. A `🔥 4-Tage-Streak` chip appears when the user has completed something on ≥3 consecutive days
   ending today or yesterday.

All values are derived client-side from `completedAt` on the fetched rows — no server work, no denormalized counters. See
`src/web/utils/todoDerive.ts` (`todayCompletedCount`, `weekDots`, `completionStreak`).

### Filter chips

Row of pills below the header: `Heute` · `Diese Woche` · `Alles` · `Blockiert`. Each chip carries a tooltip that spells out its rule. The
active chip is reflected in the URL as `?view=today|week|waiting` (the default `all` is omitted so URLs stay clean), so reloads and shared
links preserve the current view. Chip clicks use `replace` navigation — the back button doesn't get polluted with every filter tap. Matching
rules:

- **Heute** — `whenBucket === 'today'` OR `dueAt` today or overdue.
- **Diese Woche** — Heute rules + `whenBucket === 'week'` + `dueAt` within 7 days.
- **Alles** — no filtering.
- **Blockiert** — `whenBucket === 'waiting'`. Named for the user's perspective (the row is blocked pending an external reply — a quote, a
  colleague's response, a delivery). Kept out of "someday" because the row is not the user's to move.

### Inline composer

An always-visible input at the top: `Was noch?`. Right side has three toggle buttons (⚡ 🎯 🧠) for the default effort of items being typed;
selection is sticky within the session. Enter submits, clears, and keeps focus so the user can machine-gun rapid captures. Empty submissions
are ignored. Errors are logged by URQL as usual; the composer doesn't surface toast state (the row simply doesn't appear).

The composer's `GlassCard` wrapper carries a `focus-within` ring so triggering focus by any means — click, the `n` hotkey, or the
empty-state `New todo` button — reads visually even though the input itself is chrome-less.

**Filter-aware default `whenBucket`.** If the user is looking at the `Heute`, `Diese Woche`, or `Blockiert` filter chip and captures a plain
title with no NL bucket token, the new row is planted in the bucket that filter is showing (`today` / `week` / `waiting`). Otherwise the row
would be created with `whenBucket=null` and instantly disappear from view — reading as a capture failure. On the `Alles` filter the bucket
stays `null`. If NL-parsed metadata still puts the row outside the current filter (e.g. `!someday` typed on `Heute`), the page silently
switches the filter to `Alles` so the user sees the row they just created.

### Natural-language parsing

The composer runs every input through `todoParse` before submitting. Trailing tokens are stripped from the title and mapped to fields:

| Token                       | Effect                                            |
| --------------------------- | ------------------------------------------------- |
| `!heute` / `!today`         | `whenBucket=today`, `dueAt = end-of-today`        |
| `!morgen` / `!tomorrow`     | `dueAt = end-of-tomorrow`, `whenBucket=today`     |
| `!woche` / `!week`          | `whenBucket=week`                                 |
| `!irgendwann` / `!someday`  | `whenBucket=someday`                              |
| `!warten` / `!waiting`      | `whenBucket=waiting`                              |
| `~10min` / `~30min` / `~2h` | `effort=quick` / `focused` / `deep` (by duration) |
| `~q` / `~f` / `~d`          | Same three efforts, shorthand                     |

Only trailing tokens are matched; a `!heute` in the middle of a title is left alone. Tokens can appear in any order
(`Fahrrad kaufen !heute ~30min` and `Fahrrad kaufen ~30min !heute` produce the same task).

### Todo rows

Each open row is a card with a 4-pixel left-edge strip whose color encodes effort:

- `emerald-400` — quick
- `amber-400` — focused
- `violet-400` — deep
- muted — unclassified

Below the title, a muted metadata line combines the effort label, the when-bucket label, and the due date (`fällig 15.03.`) — only present
bits render, so unclassified rows stay clean. Notes clamp to one line; the full note is visible after clicking edit.

Hover surfaces three icon buttons on the right: **snooze** (moves to `whenBucket=someday`, clears `dueAt`; a `waiting` row keeps its bucket
since it isn't the user's to move — the due date still clears), **edit**, **delete**.

### Completion ritual

Clicking the checkbox on an open row plays three beats:

1. The check-path draws inside the checkbox over 260 ms with a spring easing (`cubic-bezier(0.34, 1.56, 0.64, 1)` — the overshoot is what
   sells the "click" feeling).
2. The row background pulses to a soft emerald over ~500 ms and fades back.
3. The title's strike-through animates from left to right via a `background-image` gradient (`background-size: 0% → 100%` over 300 ms),
   reading as hand-drawn rather than as a `text-decoration: line-through`.

The `WorkspaceTodoUpsert` mutation with `status: 'done'` and `completedAt: now` fires in parallel with the ritual — the server push unmounts
the row from the open list and it appears under **Heute erledigt · N** at the bottom.

Milestones trigger a `<Celebration>` in a fixed-position layer above everything:

- 3rd completion of the day — soft emerald glow expands from the checkbox and fades over ~900 ms.
- 5th — glow + a one-line affirmation slides in from the top-right and auto-dismisses after 2 s.
- 10th (and every 10th after) — same as 5th, sourced from a longer affirmation pool.

Affirmations are chosen deterministically as `count % pool.length` so users see variety without any randomness in the code (which would
break resume).

### Focus mode

Press `f` (or click the target icon in the header) with any open todo present to enter focus mode: a fixed overlay centres the top todo,
everything else is pushed behind a blurred backdrop. Enter completes the todo and exits; `Esc` exits without completing. The page-level `n`
/ `f` bindings are suspended while the overlay is up so `n` can't focus a composer that isn't mounted. Focus mode is reflected in the URL as
`?mode=focus` so a reload keeps the user in the same surface and the chat assistant can deep-link into it.

### Keyboard shortcuts

Active only when no input is focused:

| Key   | Action             |
| ----- | ------------------ |
| `n`   | Focus the composer |
| `f`   | Toggle focus mode  |
| `Esc` | Exit focus mode    |

Shortcut handling lives in `src/web/hooks/useHotkeys.ts` — small, no dependency on any third-party hotkey library.

### Empty state as reward

When the filtered list is empty, the page renders a large sparkle glyph, `Alles erledigt.` / `All done.`, and — if the user has completed ≥5
today — a subtitle acknowledging the productivity. A `New todo` button focuses the composer.

### Deep linking

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
| Parser            | `src/web/utils/todoParse.ts` (+ `.test.ts`)                                                     |
| Derivations       | `src/web/utils/todoDerive.ts` (+ `.test.ts`)                                                    |
| Hotkeys           | `src/web/hooks/useHotkeys.ts`                                                                   |
| Schema columns    | See [content-model.md](../architecture/content-model.md#tasks-added-columns)                    |

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

### URL state

Everything the user is currently looking at is encoded in query params so reloads and shared links reproduce the exact view. User
preferences ("Heute erledigt" open state) intentionally stay in `localStorage` — they're who-the-user-is, not what-they're-looking-at, and
shouldn't propagate through a share link.

| Param   | Values                         | Meaning                                                         |
| ------- | ------------------------------ | --------------------------------------------------------------- |
| `focus` | task id                        | Deep-link target: scroll into view, flash the ring, then clear. |
| `view`  | `today` \| `week` \| `waiting` | Active filter chip. Default `all` is omitted from the URL.      |
| `mode`  | `focus`                        | Focus-mode overlay is up.                                       |
| `edit`  | task id                        | Inline edit form is open on that row.                           |

### Ambient backdrop

The site-wide `AmbientBackdrop` (mounted at `__root.tsx`) already sits behind every page, so the todos surface uses that rather than
introducing its own gradient. See `src/web/components/AmbientBackdrop.tsx` and `docs/styles/theme.md`.

### Tooltips

Every icon-only affordance on the page — the ⚡🎯🧠 default-effort pickers, the header focus / options buttons, the momentum dots (which
show the exact day and completion count on hover), the per-row snooze / edit / delete buttons, the ritual checkbox itself, and the
Heute-erledigt restore button — is wrapped in a Radix `Tooltip`. The site's `TooltipProvider` is mounted globally at `__root.tsx`. Filter
chips carry a tooltip too, describing the rule each one applies. Delay is short (~0ms) so hover feels responsive.

### Animations

Row cards fade in with a small lift + spring settle on mount (`animate-todo-row-in` in `styles.css`, staggered 60ms per index). Hovering a
row lifts it 1px and brightens the border. Completion pulses a soft primary ring around the row (`data-completing='true'`, keyframe
`todo-row-complete`) in addition to the checkbox draw and the hand-drawn strike-through. Momentum dots pop in with a springy scale
(`animate-todo-dot-in`, staggered 45ms per day). Today's dot has a slow opacity pulse (`animate-pulse-dot`, 2s loop). The Heute-erledigt
chevron rotates smoothly when toggled. All animations respect `prefers-reduced-motion: reduce`.

### Reduced motion

Everything above respects `prefers-reduced-motion: reduce`:

- Row reveal, check draw, strike-through, glow, affirmation slide — all either skipped or reduced to a fade.
- The state transitions (row moves to Heute erledigt, streak updates) still happen. Only the animation timing is dropped.

## Out of scope (v1)

- **Drag reorder.** The `taskReorder` mutation exists (used by the CV page pattern) but no visual drag handle yet.
- **AI summarization / bulk-add from natural language.** Personal-assistant candidate.
- **Filtering by due date or tag.** Not needed until the list grows.

## Assistant control

The personal assistant reads standalone todos via `toolStandaloneTasksList` and mutates them through the same `taskUpsert` / `taskDelete`
commands the page uses. See [architecture/agent-delegation.md](../architecture/agent-delegation.md).
