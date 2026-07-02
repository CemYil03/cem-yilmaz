# Workspace Travel

Everything that gets Cem out the door for a trip: the list of upcoming and past trips, the reusable packing-list template plus per-trip
additions, and the small pile of pre-departure todos ("stop the mail", "charge the power bank") that don't belong in general `/todos`.

## Why a separate category

The immediate need is a travel packing list. Considered — and rejected — putting it under an existing area:

- **Under `todos`.** Works if a packing list is just a checklist. But packing lists are **templated** — Cem has a base list he reuses on
  every trip, plus trip-specific additions. `todos` doesn't model templates or trip-scoping, and packing coexists with pre-trip errands
  (visa, transport, mail hold) that only make sense grouped by trip.
- **Under `projects`.** A trip could be modeled as a project — but `projects` is kanban-shaped for ongoing work with tasks / notes / links /
  files. A trip is bounded, has a departure date, and accretes trip-shaped artefacts (itinerary, bookings, packing) that don't map cleanly
  onto the project shape.

A new category, scoped to `travel` from day one, gives room for the obvious near-term additions (itinerary, bookings, transport, visas)
without a rename later. If it turns out travel really only ever means packing, the surface can shrink — but starting narrower and regretting
it is more expensive than starting broad and letting some subsections stay empty.

## User Behavior

_Phase 1 ships the stub only._ The full behavior below is what the surface is being built toward:

- `/workspace/travel` shows a two-part landing:
  - **Upcoming trips** — cards for trips whose departure date is in the future, sorted soonest first. Each card shows destination, dates, a
    packing-progress badge (`x / y packed`), and a pre-trip-todos badge (`x / y done`).
  - **Past trips** — collapsed by default, expandable to a chronologically-descending list.
- **Base packing list** is a reusable template edited from a settings-style corner of the page. Every new trip starts from the base list as
  a fresh copy; edits to a trip's list don't retroactively touch the base or any other trip.
- **Per-trip detail** (linked from a trip card): trip meta (destination, departure/return, transport mode, accommodation), the packing
  checklist (grouped by category — Documents, Electronics, Clothing, Toiletries, etc.), and pre-trip todos with due dates relative to
  departure (e.g. "3 days before").
- **Trip-scoped todos** stay on the trip. `/workspace/todos` still exists for un-scoped tasks; the two don't spill into each other.

## Cross-references

- The hub composer's Compass ("what your assistant knows about you") consumes travel history as background context — so the assistant can
  answer "when did I last go to Istanbul?" without a separate integration.
- `/workspace/finances` may later show trip costs as a category on spending; no dependency yet.

## Implementation Details

### Route

`src/routes/{-$locale}/workspace/travel.tsx` — standard stub shape identical to `tax.tsx` / `medical.tsx`: `createFileRoute` with
`seoMeta({ noindex: true })`, one `<main>` block with a body paragraph and a muted "coming soon" line. The workspace header (mounted at the
layout) provides the breadcrumb + icon.

### Hub tile

`PERSONAL_FOCUS_AREAS` in `src/routes/{-$locale}/workspace/index.tsx` gets one new entry, placed near the end of the personal grid
(lifestyle / occasional, not daily).

### Breadcrumb

`WORKSPACE_TITLES` and `WORKSPACE_ICONS` in `src/web/components/WorkspaceHeader.tsx` get the `travel` segment. Icon: `PlaneIcon` from
`lucide-react`.

### SEO

`noindex: true`, not in `SITEMAP_PATHS` — same posture as the rest of `/workspace/*`.

## Open TODOs

- **Phase 2+ — schema.** `Trips` table (drizzle): id, userId, destinationDe, destinationEn (see the bilingual DB-content convention),
  departsOn, returnsOn (nullable), transportMode, accommodationNotes, createdAt, updatedAt.
- **Phase 2+ — packing.** `PackingTemplates` (the base list, one per user) and `PackingItems` (rows on either a template or a trip,
  discriminated by nullable foreign keys), each with: label, category, `packed` boolean (trip-scoped only), quantity, notes.
- **Phase 2+ — trip todos.** Either extend the existing `Tasks` table with a nullable `tripId` FK, or introduce `TripTodos` — decide when
  the detail page is built based on whether trip todos need the full tasks model (activity, attachments) or a slimmer one.
- **Phase 2+ — GraphQL.** `admin.trips`, `admin.trip(id)`, `admin.tripCreate`, `admin.tripUpdate`, `admin.tripDelete`, plus packing-item
  mutations; standard CQRS split.
- **Phase 2+ — template seed.** Ship the base packing list as an empty template on first render; do **not** seed with a generic default — a
  wrong default is worse than an empty list.
