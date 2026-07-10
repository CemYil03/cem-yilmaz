# Workspace nutrition: Cookbook + soft meal plan + food diary

`/workspace/nutrition` is Cem's private surface for three things: a **cookbook** of favourite dishes grouped by meal type, a **soft weekly
meal plan** (only the slots he fills exist — an empty week is zero rows), and a **food/drink diary** rolled up into an end-of-week overview.
The nutrition sub-agent is the chat-authored write path: it suggests a snack from what Cem actually likes, logs what he ate, and drafts a
week's plan.

See also:

- [architecture/agent-delegation.md](../architecture/agent-delegation.md) — `delegateToNutrition` wires up the same shape as
  `delegateToTravel`.
- [features/workspace-fitness.md](./workspace-fitness.md) — the sibling health area shipped alongside this one.
- [features/workspace-travel.md](./workspace-travel.md) — the seed-and-subscribe editor + durable-AI-plan pattern this mirrors.

## User behavior

Three tabs, switched via `?tab=cookbook|plan|diary` (defaults to `cookbook`). A `?focus=<id>` param scrolls a card/row into view and flashes
it — the assistant's deep-links use this. Plan and diary carry a `?week=<isoMonday>` param for week navigation.

- **Cookbook** — recipe cards grouped by meal type (Breakfast / Lunch / Dinner / Snack / Other), favourites starred. Each card shows tags,
  rating, prep time, servings, "last made", and an ingredient preview. The edit dialog covers title, meal type, ingredients (chip input),
  steps, tags (chip input with suggestions), favourite toggle, rating, prep time, servings, source URL, and notes.
- **Plan** — a **week grid**: rows are the seven days (Mon–Sun), columns are the four meals (breakfast / lunch / dinner / snack — `other` is
  cookbook-only). Filled cells show the recipe title or free-text idea; empty cells show a `+`. Clicking a cell opens a picker to choose a
  cookbook recipe **or** type a free-form idea. Only filled slots persist a row. Week nav via prev/next chevrons (`?week=`).
- **Diary** — an add-entry composer (description, kind food/drink, meal type, date, time) plus the current week's entries grouped by day,
  newest first. A summary card at the top counts the week's food vs drink entries — the "end-of-week overview" computed client-side from the
  seeded week (no extra query).

## Options considered

| Approach                                                               | Why we picked / didn't                                                                                                                                                                                              |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **One combined `/workspace/fitness` with a nutrition tab**             | Fewer routes, but nutrition and fitness are distinct enough (cookbook vs. gym log) that one page would be dense and the two sub-agents would blur. Two areas scale better; the hub already had room.                |
| **Two separate areas** (chosen)                                        | `/workspace/nutrition` + `/workspace/fitness`, each its own hub tile, route, and sub-agent. Matches the confirmed decision.                                                                                         |
| **Rigid full-week plan** (all 7×N slots modeled, nullable-but-present) | Heavier schema, and it forces the UI to render/track empty slots. Contradicts the "soft" ask.                                                                                                                       |
| **Soft `MealPlanEntries`, only filled slots exist** (chosen)           | A row exists only where Cem planned something. The grid derives empty cells from absence. The assistant can fill one meal or a whole week; nothing forces completeness.                                             |
| **Recipe reference OR free text on a plan slot** (chosen)              | `recipeId` (nullable, `ON DELETE SET NULL`) links to the cookbook; `customText` covers "leftovers" that isn't a recipe. Both may be set; the UI prefers the recipe. Deleting a recipe leaves the slot as bare text. |
| **Diary folded into the plan**                                         | The plan is _intent_ (future), the diary is _record_ (past). Merging them muddies "what I meant to eat" vs. "what I ate". Kept separate.                                                                            |
| **`kind` (food/drink) on the diary** (chosen)                          | Lets the weekly overview split intake without a second table or a tag convention. One varchar column.                                                                                                               |
| **Week-scoped `from`/`to` query args on plan/diary**                   | Would break the args-free seed-and-subscribe fragment every workspace page uses (the `userUpdates` subscription can't re-deliver parameterized nested fields cleanly). Rejected.                                    |
| **Fetch-all + client-side week slice** (chosen)                        | Plan and diary lists return everything; the page filters to the visible week in memory. Personal-scale volume makes this trivial and keeps the whole namespace inside one seed-and-subscribe fragment.              |
| **Recipe photos via a `RecipeFiles` → `FileUploads` join**             | Real value later, but not needed for v1. Deferred (mirrors the medical/inventory file-join shape when it lands).                                                                                                    |

## Option chosen

Three admin-only tables — `Recipes`, `MealPlanEntries`, `FoodLogEntries` — sharing a `MealType` enum. Plan slots optionally reference a
recipe (`ON DELETE SET NULL`) or carry free text. The diary distinguishes food from drink with a `kind` column. All three lists are fetched
whole and sliced to the visible week client-side, keeping the args-free seed-and-subscribe posture of every other workspace page. The
nutrition sub-agent is the primary chat write path; the page is the manual editor and read view.

## Implementation details

### Database schema (`src/server/db/schema.ts`)

`mealTypes = ['breakfast','lunch','dinner','snack','other']` (SDL `MealType`); `foodLogKinds = ['food','drink']` (SDL `FoodLogKind`).

- **`Recipes`** — `recipeId`, `title`, `mealType`, `ingredients text[]`, `steps`, `tags text[]`, `isFavorite`, `rating`, `prepTimeMinutes`,
  `servings`, `sourceUrl`, `notes`, `lastMadeAt timestamptz`, timestamps. Indexes `(mealType)`, `(isFavorite)`.
- **`MealPlanEntries`** — `entryId`, `date`, `mealType`, `recipeId` FK → Recipes **ON DELETE SET NULL**, `customText`, `notes`, timestamps.
  Index `(date)`.
- **`FoodLogEntries`** — `logId`, `consumedAt timestamptz`, `mealType`, `kind`, `description`, `recipeId` FK → Recipes **ON DELETE SET
  NULL**, `notes`, timestamps. Index `(consumedAt)`.

Migration: `drizzle/0025_tiresome_la_nuit.sql` (shared with the fitness tables).

### GraphQL

Read namespace `Admin.adminNutritionFindOne` (`AdminNutritionQuery`): `adminNutritionRecipeFindMany(mealType, favorite)`,
`adminNutritionMealPlanFindMany`, `adminNutritionFoodLogFindMany`. Write mutations on `AdminMutation` (gated once by `guardAdminMutation`):
`recipesUpsert`/`recipesDelete`, `mealPlanEntriesUpsert`/`mealPlanEntriesDelete`, `foodLogEntriesUpsert`/`foodLogEntriesDelete`. Every
mutation is a batch returning `MutationResult { success, referenceId, referenceIds }`; `referenceIds` echoes ids in input order. The page
reconciles over `userUpdates`.

### CQRS

Commands in `src/server/commands/` mirror `tripDaysUpsert.ts` (payload build → single transaction → parent-existence check via `inArray` →
per-row insert/update → one `userUpdates` publish). Referenced `recipeId`s on plan/diary upserts are verified in one round-trip. Queries in
`src/server/queries/adminNutrition*.ts` join referenced recipes in one pass. Mappers: `toGqlRecipe`, `toGqlMealPlanEntry`,
`toGqlFoodLogEntry`. Resolver wiring in `resolversCreate.ts`.

### Route

`src/routes/{-$locale}/workspace/nutrition.tsx` + `nutrition.graphql`. `useWorkspaceNutritionLiveUser` seeds from the loader and replaces on
every `WorkspaceNutritionPageUpdates` push. `max-w-8xl`, `noindex: true`, `WorkspaceUnauthorized` when `user.admin === null`. Enum labels
(`MEAL_TYPE_LABELS`, `FOOD_LOG_KIND_LABELS`) stay colocated. A shared `ChipInput` handles ingredients and tags. The plan grid indexes
entries by `date|mealType` for O(1) cell lookup; `weekStartFromParam` anchors weeks to Monday.

### Nutrition sub-agent

- **`agentPersonalAssistantNutrition.ts`** — `ToolLoopAgent` factory, model `ADMIN_CHAT_MODEL_FALLBACK_ID`, `stopWhen: [isStepCount(10)]`.
  The system prompt carries the snack-suggestion workflow (prefer `★fav` recipes of the right meal type not made recently), the "I ate/drank
  X" → `foodLogEntriesUpsert` rule, the "plan Tuesday dinner" → `mealPlanEntriesUpsert` rule, the "I made X" → `recipesUpsert.lastMadeAt`
  rule, and the `needsMoreInfo`/`noOp` sentinel contract.
- **`nutritionSnapshotForAgent.ts`** — compact markdown: cookbook grouped by meal type with favourite/rating/last-made called out, upcoming
  plan slots, and the last 15 diary entries — ids inline so the agent lifts them without a list call.
- **`toolDelegateToNutrition.ts`** — orchestrator-side delegate, structural copy of `toolDelegateToTravel` (pre-writes the parent tool-call
  row, forwards `onStepEnd`, wraps `agent.generate` in try/catch → `status: 'failed'`).
- **Tools**: reads `recipesList`, `mealPlanList`, `foodLogList`; writes `recipesUpsert` (hand-built Zod — `lastMadeAt` is `DateTime`),
  `recipesDelete`, `mealPlanEntriesUpsert` (generated schema — `Date` is safe), `mealPlanEntriesDelete`, `foodLogEntriesUpsert` (hand-built
  — `consumedAt` is `DateTime`), `foodLogEntriesDelete`. Mutation-log kinds: `recipe*`, `mealPlan*`, `foodLog*` (add/update/delete each).
- Registered on `agentPersonalAssistant` as `delegateToNutrition`; the orchestrator system prompt carries recipe / diary deep-link
  templates.

## Deferred / follow-ups

- **Recipe photos** — a `RecipeFiles` → `FileUploads` join (mirrors `MedicalRecordFiles`).
- **Macros / calories** — per-recipe or per-diary-entry nutrition facts and a weekly rollup.
- **Meal-plan → shopping list** — generate a grocery list from a week's planned recipes' ingredients.
- **Compass ingestion** — feed `nutritionSnapshotForAgent` into the compass so the orchestrator can answer "what do I usually eat?" without
  a delegation.
