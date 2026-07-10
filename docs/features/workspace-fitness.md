# Workspace fitness: Gym log + routines + exercise catalog

`/workspace/fitness` is Cem's private training surface: a **gym log** (sessions → sets, weight × reps), reusable **workout routines**
(templates like "Push day"), and an **exercise catalog** the other two draw from. The fitness sub-agent logs workouts from chat ("5×5 squats
at 100kg today") and answers progression questions ("what did I bench last time?").

See also:

- [architecture/agent-delegation.md](../architecture/agent-delegation.md) — `delegateToFitness` wires up the same shape as
  `delegateToTravel`.
- [features/workspace-nutrition.md](./workspace-nutrition.md) — the sibling health area shipped alongside this one.
- [features/workspace-travel.md](./workspace-travel.md) — the seed-and-subscribe + durable-AI-plan pattern this mirrors.

## User behavior

Three tabs, switched via `?tab=workouts|routines|exercises` (defaults to `workouts`). A `?focus=<id>` param scrolls a card into view and
flashes it — the assistant's deep-links use this.

- **Workouts** — session cards (date, title, set count, duration) that expand (accordion) to their ordered sets. Each set row shows the
  exercise, `weight × reps`, and a warmup marker, with inline edit/delete. "New workout" opens a dialog for the base facts; when created it
  can **seed sets from a routine** (one set per routine item, targets carried over). Add-set / edit-set dialogs pick the exercise and enter
  weight, reps, RPE, and the warmup flag.
- **Routines** — cards listing a routine's ordered items (exercise + target sets/reps/weight). The edit dialog builds the item list inline
  (add/remove rows, pick exercise, set targets). Starting a workout from a routine is done from the Workouts tab's "New workout" dialog.
- **Exercises** — the catalog grid grouped by muscle group. The edit dialog covers name, muscle group, and equipment.

## Options considered

| Approach                                                      | Why we picked / didn't                                                                                                                                                                                           |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Strength log only** (sessions + sets + exercises)           | The core "gym progress" ask. Would ship faster but the confirmed scope also wanted reusable routines.                                                                                                            |
| **Strength log + routines/templates** (chosen)                | Five tables: `Exercises`, `WorkoutRoutines` + `WorkoutRoutineItems`, `WorkoutSessions` + `WorkoutSets`. Routines are reusable templates a session can be seeded from. Matches the confirmed v1.                  |
| **Body metrics (weight / body-fat sparkline)**                | High value and cheap (reuse the inventory valuation chart), but out of the confirmed v1. Deferred.                                                                                                               |
| **Cardio / activity log + fitness goals**                     | Runs/rides with distance/duration, and goals like "bench 100kg". Deferred — the strength log covers the primary use, and folding cardio into `WorkoutSessions` later is additive.                                |
| **Sets carry `weight`/`reps` directly, warmup flag** (chosen) | A `WorkoutSet` is the atomic log unit. `isWarmup` keeps warmups out of PR math. `numeric` weights round-trip half-kg plates. The `(exerciseId)` index backs the "what did I bench last time?" per-exercise read. |
| **Session `routineId` FK, `ON DELETE SET NULL`** (chosen)     | A session records which routine seeded it, but survives the routine's deletion (the log is history). Seeding copies routine items into sets at creation — it is not a live link.                                 |
| **Drag-reorder routines / sets via a shared hook**            | No `useReorderableList` hook exists in the repo yet. Ordering is by `position` (assigned at insert / from the editor's row order); explicit drag-reorder is a follow-up.                                         |

## Option chosen

Five admin-only tables sharing `MuscleGroup` / `EquipmentType` enums. `WorkoutSets` and `WorkoutRoutineItems` cascade-delete under their
parents and their exercise; `WorkoutSessions.routineId` sets null on routine delete. Weights are `numeric` (mode `number`). Starting a
session from a routine copies its items into sets at creation. The fitness sub-agent is the primary chat write path; the page is the manual
editor and read view.

## Implementation details

### Database schema (`src/server/db/schema.ts`)

`muscleGroups = ['chest','back','legs','shoulders','arms','core','fullBody','cardio','other']` (SDL `MuscleGroup`);
`equipmentTypes = ['barbell','dumbbell','machine','cable','bodyweight','kettlebell','other']` (SDL `EquipmentType`).

- **`Exercises`** — `exerciseId`, `name`, `muscleGroup`, `equipment` (nullable), `notes`, timestamps. Index `(muscleGroup)`.
- **`WorkoutRoutines`** — `routineId`, `name`, `notes`, `position`, timestamps. Index `(position)`.
- **`WorkoutRoutineItems`** — `routineItemId`, `routineId` FK **CASCADE**, `exerciseId` FK **CASCADE**, `position`, `targetSets`,
  `targetReps`, `targetWeight numeric`, `notes`, timestamps. Index `(routineId, position)`.
- **`WorkoutSessions`** — `sessionId`, `date`, `title`, `routineId` FK **SET NULL**, `durationMinutes`, `notes`, timestamps. Index `(date)`.
- **`WorkoutSets`** — `setId`, `sessionId` FK **CASCADE**, `exerciseId` FK **CASCADE**, `position`, `weight numeric`, `reps`, `rpe`,
  `isWarmup`, `notes`, timestamps. Indexes `(sessionId, position)`, `(exerciseId)`.

Migration: `drizzle/0025_tiresome_la_nuit.sql` (shared with the nutrition tables).

### GraphQL

Read namespace `Admin.adminFitnessFindOne` (`AdminFitnessQuery`): `adminFitnessExerciseFindMany`, `adminFitnessRoutineFindMany` (items
pre-joined, exercises hydrated), `adminFitnessSessionFindMany` (sets pre-joined, `date DESC`). Write mutations on `AdminMutation`:
`exercisesUpsert`/`Delete`, `workoutRoutinesUpsert`/`Delete`, `workoutRoutineItemsUpsert`/`Delete`, `workoutSessionsUpsert`/`Delete`,
`workoutSetsUpsert`/`Delete`. All batch, all return `MutationResult`; `referenceIds` echoes ids in input order — logging a workout is
`workoutSessionsUpsert` (one session) then `workoutSetsUpsert` (every set) using the session's `referenceIds` as the parent id.

### CQRS

Commands mirror `tripActivitiesUpsert.ts` for the child tables (parent + exercise existence checked via `inArray`; `position` tail read once
per parent and incremented locally). Queries in `src/server/queries/adminFitness*.ts` fan out one query per relation and normalize in
memory. Mappers: `toGqlExercise`, `toGqlWorkoutRoutine`, `toGqlWorkoutRoutineItem`, `toGqlWorkoutSession`, `toGqlWorkoutSet`. Resolver
wiring in `resolversCreate.ts`.

### Route

`src/routes/{-$locale}/workspace/fitness.tsx` + `fitness.graphql` (replaces the Phase-1 stub). `useWorkspaceFitnessLiveUser` seeds and
subscribes over `WorkspaceFitnessPageUpdates`. `max-w-8xl`, `noindex: true`, `WorkspaceUnauthorized` fallback. Enum labels
(`MUSCLE_GROUP_LABELS`, `EQUIPMENT_LABELS`) stay colocated. A shared `DeleteAlert` handles all five entities via a `mutation` discriminator.
Session cards use an accordion; "New workout" seeds sets from a chosen routine by firing `workoutSessionsUpsert` then `workoutSetsUpsert`.

### Fitness sub-agent

- **`agentPersonalAssistantFitness.ts`** — `ToolLoopAgent` factory, model `ADMIN_CHAT_MODEL_FALLBACK_ID`, `stopWhen: [isStepCount(10)]`.
  System prompt: log-a-workout workflow (`workoutSessionsUpsert` → `workoutSetsUpsert`, "5×5" = five rows), auto-create a missing exercise
  first, answer progression from the snapshot, build-a-routine workflow, and the `needsMoreInfo`/`noOp` sentinel contract.
- **`fitnessSnapshotForAgent.ts`** — compact markdown: each exercise with its **last** and **best working set** pre-computed (the "what did
  I bench last time?" answer), routines with their items, and the last 8 sessions — ids inline.
- **`toolDelegateToFitness.ts`** — orchestrator-side delegate, structural copy of `toolDelegateToNutrition`.
- **Tools**: reads `exercisesList`, `routinesList`, `workoutSessionsList`; writes `exercisesUpsert`/`Delete`,
  `workoutRoutinesUpsert`/`Delete`, `workoutRoutineItemsUpsert`/`Delete`, `workoutSessionsUpsert`/`Delete`, `workoutSetsUpsert`/`Delete` —
  all reuse the generated `GqlS*InputSchema()` (no `DateTime` fields; `Date` is a safe string). Mutation-log kinds: `exercise*`, `routine*`,
  `routineItem*`, `session*`, `set*`.
- Registered on `agentPersonalAssistant` as `delegateToFitness`; the orchestrator system prompt carries workout / routine / exercise
  deep-link templates.

## Deferred / follow-ups

- **Body metrics** — a `BodyMetrics` table (weight, body-fat, date) with a sparkline reusing the inventory valuation chart.
- **Cardio / activity log** — distance/duration entries, either a new table or a `kind` on sessions.
- **Fitness goals** — target lifts / bodyweight with progress, like the finances goals.
- **Per-exercise progression detail** — a `/workspace/fitness/exercise/<id>` route charting weight over time.
- **Drag-reorder** for routine items and sets once a shared reorder hook exists.
- **Compass ingestion** — feed `fitnessSnapshotForAgent` into the compass so the orchestrator can answer training questions without a
  delegation.
