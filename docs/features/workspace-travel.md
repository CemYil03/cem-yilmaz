# Workspace Travel

Trip planner for Cem: an admin editor at `/workspace/travel` plus a durable AI use-case where the workspace assistant drafts a day-by-day
itinerary and packing list directly into Postgres. The whole point of the persistence layer is that a fresh chat can read the plan back
without replaying the conversation.

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

## User Behavior

`/workspace/travel` is the list surface. Cards show one trip each with destination, dates, status, day count, and packing progress
(`x/y packed`). Two tabs — **Upcoming** (default) and **Past** — group by status; upcoming holds anything not `completed` / `cancelled`,
past holds the rest. A "New trip" button opens the base-facts dialog (title, destination, dates, status, transport, accommodation, notes).

`/workspace/travel/<tripId>` is the per-trip detail. Header renders the trip's facts; below it two side-by-side sections:

- **Itinerary** — one collapsible block per `TripDay` (labeled "Day N · date · title"). Inside each day is an ordered list of
  `TripActivities` with time, title, location, url, notes. Add / edit / delete affordances at both levels.
- **Packing list** — checkbox rows grouped by free-text `category` (Documents, Electronics, Clothing, Toiletries, …). Each row shows
  quantity when > 1 and a notes preview. Checking the box calls `tripPackingItemToggle`.

## The AI use-case (the whole reason this feature exists)

The workspace assistant at `/workspace/assistant` gains a `delegateToTravel` tool that hands trip briefs to `agentPersonalAssistantTravel`.
Cem says _"plan me a 3-day trip to Rome from Aug 5–7 with one main activity per day"_, and the sub-agent runs a chain of `tripUpsert` →
three `tripDayUpsert` → three `tripActivityUpsert` writes in a single turn. The trip surfaces on `/workspace/travel` immediately over
`userUpdates`; a fresh chat later reads the plan from the DB via the same `travelSnapshotForAgent` call that primes the sub-agent's system
prompt.

The sub-agent's rules:

- **Bias toward drafting.** A vague scope ("a couple of things per day") is enough — pick well-known highlights for the destination and file
  them as activities. Ask for clarification only when a required field is genuinely missing (no destination, no dates for a new trip,
  ambiguity between multiple existing trips).
- **Never invent ids.** Ids come from the snapshot or from a tool result earlier in the same turn.
- **Reply in the user's language** (German or English).
- **Times are wall-clock strings** (`HH:MM` / `HH:MM:SS`). The trip is location-scoped; a timezone offset would be a lie.
- **`needsMoreInfo` / `noOp` sentinels** for the two escape hatches — same shape as every other domain sub-agent (`agent-delegation.md`).

The packing list is trip-scoped in v1: adding "Passport" to Rome doesn't touch Berlin. See _Future work_ for the reusable-template idea.

## Cross-references

- The hub composer's Compass ("what your assistant knows about you") consumes travel history as background context — so the assistant can
  answer "when did I last go to Istanbul?" without a separate integration.
- `/workspace/finances` may later show trip costs as a category on spending; no dependency yet.

## Implementation Details

### Schema (in `src/server/db/schema.ts`)

Four tables, admin-only convention — no `userId` on domain rows, no `*De`/`*En` pairs, PK is `<entity>Id`:

- **`Trips`** — `tripId`, `title`, `destination`, `startsOn`, `endsOn`, `status` (`draft` | `planned` | `active` | `completed` |
  `cancelled`, default `draft`), `transportMode` (`flight` | `train` | `car` | `ferry` | `mixed`, nullable), `accommodation`, `notes`,
  timestamps.
- **`TripDays`** — FK to `Trips` (cascade), `dayNumber` (1-based, unique per trip), `date` (nullable), `title`, `summary`, timestamps.
- **`TripActivities`** — FK to `TripDays` (cascade), `position` (int, indexed with `tripDayId`), `startsAt` / `endsAt` (wall-clock varchar),
  `title`, `location`, `url`, `notes`, timestamps.
- **`TripPackingItems`** — FK to `Trips` (cascade), `category`, `label`, `quantity`, `packed`, `position`, `notes`, timestamps.

Enum tuples exported as `TRIP_STATUSES` and `TRANSPORT_MODES`, mirrored in `schema.graphqls` as `TripStatus` / `TransportMode`.

### CQRS wiring

Standard `commands/` (`tripUpsert`, `tripDelete`, `tripDayUpsert`, `tripDayDelete`, `tripActivityUpsert`, `tripActivityDelete`,
`tripPackingItemUpsert`, `tripPackingItemDelete`, `tripPackingItemToggle`), `queries/` (`tripList`, `tripGet`), `mappers/` (`toGqlTrip`,
`toGqlTripDay`, `toGqlTripActivity`, `toGqlTripPackingItem`). Every command ends with `serverRuntime.publish.userUpdates({ userId })` so the
seeded-and-subscribed pages replace state on write.

Resolver wiring lives in `src/server/graphql/resolversCreate.ts`: `Admin.travel` shell, `AdminTravelQuery.trips` / `AdminTravelQuery.trip`,
and mutation handlers on `AdminMutation`. `guardAdminMutation` at the parent field authorizes once.

### Sub-agent

- Factory: `src/server/agents/agentPersonalAssistantTravel.ts` — model pinned to `ADMIN_CHAT_MODEL_FALLBACK_ID` (Flash), `stopWhen` is
  `[isStepCount(10)]`, system prompt embeds `currentDateForAgent()` and `travelSnapshotForAgent`.
- Snapshot: `src/server/agents/travelSnapshotForAgent.ts` — compact markdown listing every trip with day count, per-day activities, and
  packing progress. Each row keeps its id inline so the agent can address it in mutation tools without a `tripsList` call.
- Read tools: `toolTripsList`, `toolTripGet`.
- Mutation tools: `toolTripUpsert`, `toolTripDelete`, `toolTripDayUpsert`, `toolTripDayDelete`, `toolTripActivityUpsert`,
  `toolTripActivityDelete`, `toolTripPackingItemUpsert`, `toolTripPackingItemDelete`, `toolTripPackingItemToggle`. Each is a thin wrapper
  around the matching command; input schemas are hand-built `z.object`s (ISO strings, not `z.date()`) per the agent-delegation convention.
- Mutation-log `TravelAgentMutationKind` union covers add / update / delete for each entity plus the packing-item toggle. Every tool pushes
  `{ kind, id, title }` on success — the orchestrator uses these to narrate what changed.
- Delegate: `src/server/agents/toolDelegateToTravel.ts` — structural copy of `toolDelegateToMedia.ts`. Pre-writes its parent
  `chatMessagesToolCall` row, spawns the sub-agent with a `childOnStepContext` that persists nested calls under the delegate row, wraps
  `agent.generate` in try/catch → `status: 'failed'`.
- Registered on `agentPersonalAssistant` alongside the other four delegates. System prompt extended with the "when to delegate" travel
  bullet and the `/workspace/travel/<tripId>` deep-link template.

### Route

`src/routes/{-$locale}/workspace/travel.tsx` — list surface. Loader hits `WorkspaceTravelPageDocument`; the page seeds-and-subscribes via
`useWorkspaceTravelLiveUser`. `?tab=` in the search schema chooses upcoming vs past. `noindex: true`, not in `SITEMAP_PATHS`.

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
- **File attachments per trip.** Boarding passes, hotel confirmations, insurance PDFs. Would mirror `MedicalRecordFiles` — a `TripFiles`
  join between `Trips` and the shared `FileUploads` table. Deferred because the current AI-driven flow does not need binary artefacts.
- **Compass ingestion.** `travelSnapshotForAgent` is currently only read by the travel sub-agent. Feeding it into the compass would let the
  personal-assistant orchestrator answer "when did I last go to Istanbul?" without a delegation.
