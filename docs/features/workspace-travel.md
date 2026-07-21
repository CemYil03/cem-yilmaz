# Workspace Travel

Trip planner for the admin: an admin editor at `/workspace/travel` plus a durable AI use-case where the workspace assistant drafts a
day-by-day itinerary and packing list directly into Postgres. The whole point of the persistence layer is that a fresh chat can read the
plan back without replaying the conversation.

## Why a separate category

The immediate need is a trip planner with a day-by-day itinerary and a per-trip packing list. Considered — and rejected — putting it under
an existing area:

- **Under `todos`.** Works if a packing list is just a checklist. But packing coexists with an itinerary and pre-trip errands (visa,
  transport, mail hold) that only make sense grouped by trip. `todos` doesn't model trip-scoping.
- **Under `projects`.** A trip could be modeled as a project — but `projects` is kanban-shaped for ongoing work with tasks / notes / links /
  files. A trip is bounded, has a departure date, and accretes trip-shaped artefacts (itinerary, activities, packing) that don't map cleanly
  onto the project shape.

A new category, scoped to `travel` from day one, gives room for the obvious near-term additions (bookings, transport, visas) without a
rename later.

## Trip shape (the datedness switch)

The feature follows one rule: **derive, don't store, anything a stored field already implies.** Two facts are therefore _not_ columns — they
are computed at read time — because storing them would let them drift out of sync with the trip's dates:

- **A day's calendar date.** For a dated trip, "Day 3" _is_ `startsOn + 2`; storing a separate `date` would be a duplicate that can
  disagree. So `dayNumber` (1-based) is the single ordering key, and the date is derived via `deriveDayDate(startsOn, dayNumber)`. A
  dateless "sketch" trip has no date at all — `dayNumber` is all there is.
- **The trip's time-phase (upcoming / underway / past).** These are pure functions of the `startsOn`/`endsOn` range against today. The old
  `active` / `completed` statuses stored exactly this and went stale the moment a trip's dates passed. They're gone — `status` now carries
  only **planning intent**: `draft` (still sketching), `planned` (confirmed it's happening), `cancelled` (called off). Dates can't express
  intent, so intent is the one thing worth storing.

`startsOn` / `endsOn` **stay stored** — they're the authoritative span, set on the trip, not derivable from anything else (a fresh "Rome Aug
5–7" trip has a range before it has any day rows). Whether a trip is _dated_ (`startsOn` present) is the master switch that governs display:

|                              | **Scheduled** (`startsOn` set)          | **Sketch** (no dates)       |
| ---------------------------- | --------------------------------------- | --------------------------- |
| Time-phase                   | derived from `startsOn`/`endsOn`        | N/A — just "planning"       |
| Day label                    | derived weekday + calendar date         | "Day N"                     |
| Ordering key                 | `dayNumber` (date is a projection)      | `dayNumber`                 |
| Day-editor `dayNumber` field | hidden (position implied by start date) | shown                       |
| Day-editor date picker       | removed (implied)                       | removed (nothing to pin to) |

## User Behavior

`/workspace/travel` is the list surface. Cards show one trip each with destination, dates, status (intent), day count, and packing progress
(`x/y packed`). Three tabs — **Current**, **Planned**, and **Past** — group trips by their **derived time-phase**, not by a stored status:

- **Past** — the trip is `cancelled`, or its `endsOn` is before today.
- **Current** — not cancelled, fully dated, and today falls inside `startsOn … endsOn`.
- **Planned** — everything else: drafts, undated sketches, and dated trips that haven't started.

The default tab is **Current** whenever any trip is underway, otherwise **Planned**, so the eye always lands on something useful; the
default tab's URL carries no `?tab=`. A "New trip" button opens the base-facts dialog (title, destination, dates as a single
`DateRangePicker`, status, transport, accommodation, notes).

`/workspace/travel/<tripId>` is the per-trip detail. Header renders the trip's facts; below it two side-by-side sections:

- **Itinerary** — one collapsible block per `AdminTravelTripDay`. A **dated** trip's day header leads with the derived weekday + calendar
  date (so the plan reads as calendar dates); a **dateless** trip's header shows "Day N". Inside each day is an ordered list of
  `AdminTravelTripActivity` rows with time, title, location, url, notes. Add / edit / delete affordances at both levels. The day editor
  hides the day-number field for dated trips (position is implied by the start date) and carries no date picker in either mode — a day's
  date is never set by hand. Each activity also carries a **move-to-next-day** button (calendar-arrow icon) — one click retargets the
  activity onto the following day, appended to its tail. The button is hidden on the trip's last day (no later day to move onto). This is a
  client-only affordance: the detail page already holds every day with its activities, so it computes the next day's tail `position` and
  reuses the `adminTravelTripActivitiesUpsert` mutation with the new `tripDayId` — no new mutation. Because the id is kept, the server
  treats it as an update and honours the passed `position` rather than recomputing a tail default.
- **Packing list** — checkbox rows grouped by free-text `category` (Documents / Dokumente, Electronics / Elektronik, …). Each row shows
  quantity when > 1 and a notes preview. Checking the box calls the `adminTravelTripPackingItemsUpsert` mutation with a one-element array
  flipping `packed`. The add/edit dialog suggests locale-matched defaults via a shadcn `Popover`-backed combobox (Documents, Electronics,
  Clothing, Toiletries, Health, Money, Misc, Other — and their DE counterparts) merged with any categories already on the trip; the
  suggestion list filters as you type and offers an "Add «value»" row, but typing a custom string is always allowed — the column stays
  free-text, and picking a suggestion writes the active-locale label.

## The AI use-case (the whole reason this feature exists)

The workspace assistant at `/workspace/assistant` gains a `delegateToTravel` tool that hands trip briefs to `agentPersonalAssistantTravel`.
The admin says _"plan me a 3-day trip to Rome from Aug 5–7 with one main activity per day"_, and the sub-agent lands the whole plan in
**four tool calls** — `tripsUpsert` (one trip) → `tripDaysUpsert` (three days at once) → `tripActivitiesUpsert` (every activity across every
day) → `tripPackingItemsUpsert` (the whole checklist). Each call is one transaction; each returns a `MutationResult` whose `referenceIds`
array carries the ids of the rows it touched, in input order, so the next call can use those as parent ids without a follow-up read. The
trip surfaces on `/workspace/travel` immediately over `userUpdates`; a fresh chat later reads the plan from the DB via the same
`travelSnapshotForAgent` call that primes the sub-agent's system prompt.

The sub-agent's rules:

- **Bias toward drafting.** A vague scope ("a couple of things per day") is enough — pick well-known highlights for the destination and file
  them as activities. Ask for clarification only when a required field is genuinely missing (no destination, no dates for a new trip,
  ambiguity between multiple existing trips).
- **Never invent ids.** Ids come from the snapshot or from a prior tool result's `referenceIds` (in input order) earlier in the same turn.
- **Reply in the user's language** (German or English).
- **Times are wall-clock strings** (`HH:MM` / `HH:MM:SS`). The trip is location-scoped; a timezone offset would be a lie.
- **Status is intent only** — `draft` / `planned` / `cancelled`. The sub-agent never sets `active` or `completed`; a trip's upcoming /
  underway / past phase is derived from its dates, and the snapshot already shows that phase word next to the status.
- **Days carry no date.** The sub-agent sets `dayNumber` (1-based); the calendar date is derived from the trip's `startsOn`. To move a plan
  in time it edits the trip's `startsOn`/`endsOn`, not the days.
- **`needsMoreInfo` / `noOp` sentinels** for the two escape hatches — same shape as every other domain sub-agent (`agent-delegation.md`).

The packing list is trip-scoped in v1: adding "Passport" to Rome doesn't touch Berlin. See _Future work_ for the reusable-template idea.

## Cross-references

- The hub composer's Compass ("what your assistant knows about you") consumes travel history as background context — so the assistant can
  answer "when did I last go to Istanbul?" without a separate integration.
- `/workspace/finances` may later show trip costs as a category on spending; no dependency yet.

## Implementation Details

### Schema (in `src/server/db/schema.ts`)

Four tables, admin-only convention — no `userId` on domain rows, no `*De`/`*En` pairs, PK is `<entity>Id`. Every table, GraphQL type, and
input carries the `AdminTravel` entity-access-path prefix so the physical table name equals its GraphQL type (see
[`docs/conventions.md`](../conventions.md) → "Type & input naming"):

- **`AdminTravelTrip`** — `tripId`, `title`, `destination`, `startsOn`, `endsOn`, `status` (`draft` | `planned` | `cancelled`, default
  `draft` — planning **intent** only; time-phase is derived from the dates, never stored), `transportMode` (`flight` | `train` | `car` |
  `ferry` | `mixed`, nullable), `accommodation`, `notes`, timestamps.
- **`AdminTravelTripDay`** — FK to `AdminTravelTrip` (cascade), `dayNumber` (1-based, unique per trip, the single ordering key), `title`,
  `summary`, timestamps. **No stored date** — the GraphQL type exposes a read-only `date` field derived server-side by
  `deriveDayDate(startsOn, dayNumber)` in `toGqlAdminTravelTripDay` (null for undated trips); the input type has no `date`.
- **`AdminTravelTripActivity`** — FK to `AdminTravelTripDay` (cascade), `position` (int, indexed with `tripDayId`), `startsAt` / `endsAt`
  (wall-clock varchar), `title`, `location`, `url`, `notes`, timestamps.
- **`AdminTravelTripPackingItem`** — FK to `AdminTravelTrip` (cascade), `category`, `label`, `quantity`, `packed`, `position`, `notes`,
  timestamps.

Enum tuples exported as `tripStatuses` and `transportModes`, mirrored in `schema.graphqls` as `AdminTravelTripStatus` /
`AdminTravelTransportMode`. The original access-path rename shipped as `drizzle/0027_travel_access_path_rename.sql`; the intent-only status
plus dropped `AdminTravelTripDay.date` column ship as the hand-authored `drizzle/0031_worried_fixer.sql`, which first remaps any existing
`active` / `completed` rows to `planned` (they were confirmed-and-happening trips) before dropping the column.

### CQRS wiring

Every mutation on the travel domain is a **batch** and returns `MutationResult { success, referenceIds }` — never a hydrated entity. The
seed-and-subscribe posture over `userUpdates` already delivers the new state to every subscriber, so a mutation returning the row would
create a second source of truth to keep aligned with the subscription payload. `referenceIds` echoes the ids of every row the batch touched,
in input order — the sub-agent uses these to address newly-created days as the parent id when it calls `tripActivitiesUpsert` in the same
turn.

Standard `commands/` (`adminTravelTripsUpsert`, `adminTravelTripsDelete`, `adminTravelTripDaysUpsert`, `adminTravelTripDaysDelete`,
`adminTravelTripActivitiesUpsert`, `adminTravelTripActivitiesDelete`, `adminTravelTripPackingItemsUpsert`,
`adminTravelTripPackingItemsDelete`), `queries/` (`adminTravelTripFindMany`, `adminTravelTripFindOne`), `mappers/` (`toGqlAdminTravelTrip`,
`toGqlAdminTravelTripDay`, `toGqlAdminTravelTripActivity`, `toGqlAdminTravelTripPackingItem`). Every command ends with
`serverRuntime.publish.userUpdates({ userId })` (one publish per batch, not per row) so the seeded-and-subscribed pages replace state on
write.

Command signatures are `(userId, rowsOrIds, requestingSession, serverRuntime)` — `rowsOrIds` is either a `readonly GqlS<X>Input[]` (upserts)
or a `readonly string[]` (deletes). Each `resolversCreate.ts` handler unwraps `args.trips` / `args.tripDayIds` / … before calling. Upserts
run inside a single `serverRuntime.db.transaction(...)`; a failure anywhere rolls the whole batch back. Parent-existence checks use
`inArray(...)` so verification is one round-trip regardless of batch size — a hallucinated `tripId` fails the transaction rather than
landing as an FK violation. Tail-position handling for `adminTravelTripActivitiesUpsert` and `adminTravelTripPackingItemsUpsert` reads the
tail once per `tripDayId` / `(tripId, category)` and increments locally so a same-bucket batch lays out its new rows contiguously without
per-row DB reads.

Resolver wiring lives in `src/server/graphql/resolversCreate.ts`: `Admin.adminTravelFindOne` shell,
`AdminTravelQuery.adminTravelTripFindMany` / `AdminTravelQuery.adminTravelTripFindOne`, and mutation handlers on `AdminMutation`.
`guardAdminMutation` at the parent field authorizes once.

Passing a one-element array is fine — the UI does exactly that for every dialog: the "New trip" dialog calls
`adminTravelTripsUpsert(trips: [row])`, the packing checkbox calls
`adminTravelTripPackingItemsUpsert(tripPackingItems: [{ ...row, packed: !row.packed }])`, and every delete alert passes a one-element id
array. There is no separate singular path.

### Sub-agent

- Factory: `src/server/agents/agentPersonalAssistantTravel.ts` — model pinned to `ADMIN_CHAT_MODEL_FALLBACK_ID` (Flash), `stopWhen` is
  `[isStepCount(10)]`, system prompt embeds `currentDateForAgent()` and `travelSnapshotForAgent`.
- Snapshot: `src/server/agents/travelSnapshotForAgent.ts` — compact markdown listing every trip with day count, per-day activities, and
  packing progress. Each row keeps its id inline so the agent can address it in mutation tools without a `tripsList` call.
- Read tools: `toolTripsList`, `toolTripGet`.
- Mutation tools: `toolTripsUpsert`, `toolTripsDelete`, `toolTripDaysUpsert`, `toolTripDaysDelete`, `toolTripActivitiesUpsert`,
  `toolTripActivitiesDelete`, `toolTripPackingItemsUpsert`, `toolTripPackingItemsDelete`. Each upsert tool wraps the generated
  `GqlSAdminTravel<Row>InputSchema()` in a one-key `z.object({ <entities>: z.array(...) })` — Gemini-safe because the travel inputs use
  `Date` scalars, not `DateTime`. See `docs/architecture/agent-delegation.md` for when generated vs. hand-built is appropriate.
- The LLM-facing tool names stay short (`tripsUpsert`, `tripDaysUpsert`, …) — they are the sub-agent's own vocabulary, not the resolver
  surface. The GraphQL mutations and `commands/` functions they call are the access-path form (`adminTravelTripsUpsert`, …).
- **Whole-plan writes are FOUR tool calls.** A fresh plan is `tripsUpsert` (one trip) → `tripDaysUpsert` (every day at once) →
  `tripActivitiesUpsert` (every activity across every day) → `tripPackingItemsUpsert` (the whole checklist). Well under `isStepCount(10)`,
  no `tripUpsertDeep` needed — the batch tools ARE the composition primitive.
- Mutation-log `TravelAgentMutationKind` union covers add / update / delete for each entity. Every tool pushes one entry per row it touched
  (using `referenceIds` to attribute inserts back to their input row) — the orchestrator uses these to narrate what changed. A batch call
  still narrates as "created trip X, added days 1–3, added six activities, added four packing items".
- Delegate: `src/server/agents/toolDelegateToTravel.ts` — structural copy of `toolDelegateToMedia.ts`. Pre-writes its parent
  `chatMessagesToolCall` row, spawns the sub-agent with a `childOnStepContext` that persists nested calls under the delegate row, wraps
  `agent.generate` in try/catch → `status: 'failed'`.
- Registered on `agentPersonalAssistant` alongside the other four delegates. System prompt extended with the "when to delegate" travel
  bullet and the `/workspace/travel/<tripId>` deep-link template.

### Route

`src/routes/{-$locale}/workspace/travel.tsx` — list surface. Loader hits `WorkspaceTravelPageDocument`; the page seeds-and-subscribes via
`useWorkspaceTravelLiveUser`. `?tab=` in the search schema chooses current / planned / past; the default tab (current if any trip is
`active`, else planned) drops the key. `noindex: true`, not in `SITEMAP_PATHS`.

`src/routes/{-$locale}/workspace/travel_.$tripId.tsx` — per-trip detail. Loader hits `WorkspaceTravelDetailDocument` with `tripId` from the
route params; the page seeds-and-subscribes via `useWorkspaceTravelDetailLiveUser(seed, tripId)`. Sections are two-column on `xl+` screens,
stacked below (`grid xl:grid-cols-5` — 3 for itinerary, 2 for packing).

### Hub tile, breadcrumb, SEO

Already in place from the Phase-1 stub: `PERSONAL_FOCUS_AREAS` entry with `PlaneIcon`, `WORKSPACE_TITLES.travel`, `WORKSPACE_ICONS.travel`.
Every travel route is `noindex: true` and absent from `SITEMAP_PATHS` — same posture as the rest of `/workspace/*`.

## Future Work

- **Reusable base packing template.** A `PackingTemplates` singleton per user, plus `PackingItems` rows discriminated by nullable FKs
  (template vs. trip). A new trip starts by copying the template rows onto itself; template edits do not retroactively touch a trip's list.
  Deferred because the AI use-case is complete without it — the assistant can seed the packing list per trip on demand.
- **Bookings.** Structured rows for flights, hotels, reservations with confirmation numbers, times, references. Currently expressed as an
  activity with a `url` and free-text `notes`.
- **Cost tracking / budget.** Per-activity or per-booking cost, running total, currency. Overlaps with the Finances area and is deferred
  until that area lands.
- **File attachments per trip.** Boarding passes, hotel confirmations, insurance PDFs. Would mirror `AdminMedicalRecordFile` — a `TripFiles`
  join between `AdminTravelTrip` and the shared `FileUploads` table. Deferred because the current AI-driven flow does not need binary
  artefacts.
- **Compass ingestion.** `travelSnapshotForAgent` is currently only read by the travel sub-agent. Feeding it into the compass would let the
  personal-assistant orchestrator answer "when did I last go to Istanbul?" without a delegation.
