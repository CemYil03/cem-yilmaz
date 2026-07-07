# Workspace medical: Health journal + Appointment tracker

`/workspace/medical` is Cem's private surface for two things: a **health journal** — chat-authored records of symptoms, injuries, and health
notes filed by the medical sub-agent from workspace-assistant conversations — and an **appointment tracker** that groups visits by
specialist category (dentist, GP, dermatology, …) and answers "when is my next visit due?" from a per-category cadence.

See also:

- [architecture/agent-delegation.md](../architecture/agent-delegation.md) — `delegateToMedical` wires up the same shape as
  `delegateToMedia`.
- [architecture/file-storage.md](../architecture/file-storage.md) — record attachments (rash photos, lab-result screenshots) reuse the
  shared `FileUploads` primitive via a `MedicalRecordFiles` join, same wire as inventory receipts.
- [features/workspace-media.md](./workspace-media.md) — the closest sibling admin editor; medical's file shape mirrors it exactly.

## User behavior

Three tabs, switched via a `?tab=overview|appointments|records` search param (defaults to `overview`). A `?focus=<id>` param scrolls the
matching card / row into view and highlights it for a moment — the assistant's deep-links use this.

- **Overview** — one card per `MedicalCategory`, always all eight visible so the grid never has holes. Each card shows the category label,
  the last completed visit's date, the next-due date, and a red **Overdue** badge when the next-due is in the past. Cards also preview
  upcoming visits (up to 3) and recent records (up to 3, deep-linkable to the Records tab).
- **Appointments** — list grouped by category. Each row shows title, status chip, scheduled-at, provider, and (when set) `nextDueAt`. Past
  `scheduled` rows get a one-click **Complete** button that calls `medicalAppointmentComplete`. The edit dialog opens from the kebab menu —
  title / category / provider / when / next-due / status / notes.
- **Records** — flat list ordered by `occurredAt DESC`. Each card shows title, category chip, severity chip, date, the free-text summary,
  symptom and body-area chips, and an inline thumbnail grid for attached photos (or a filename chip for other files). The record editor
  supports drag-drop / picker file upload; on **create**, files are staged as pending `fileUploadIds` and attached inline via
  `medicalRecordUpsert`; on **edit**, files go straight to `medicalRecordFileAttach` so the record stays consistent between saves.

The medical sub-agent authors most records from the workspace assistant chat. This page is the manual editor and read view — you can still
create records or appointments by hand if you prefer.

## Options considered

| Approach                                                                            | Why we picked / didn't                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **One unified `MedicalEntry` with a `type` discriminator**                          | Simplest DB. Loses type-safety at the field level (severity applies to records, not appointments; `nextDueAt` applies to appointments, not records) and adds branching everywhere in the UI and in the agent tools.                                                                                                                                                                                                                                    |
| **Records + Appointments + Providers**                                              | Adds a dedicated `MedicalProvider` table (dentist Dr. X with contact info). Sturdier long-term, but Cem doesn't have enough providers for the table to earn its keep — a `providerName varchar` on `MedicalAppointment` covers "which dentist" without a join. Deferred until the provider directory grows enough to want its own page.                                                                                                                |
| **Two tables: `MedicalRecord` + `MedicalAppointment`** (chosen)                     | Records are chat-authored health notes with symptoms / body areas / severity. Appointments are scheduled or completed visits with a provider. `MedicalRecord.appointmentId` optionally cross-links the two; on appointment delete the FK is nulled so records survive.                                                                                                                                                                                 |
| **Per-appointment cadence** (`nextDueAt` set manually on each row)                  | No cadence math, no derived overdue flag. Puts the burden on Cem (or the agent) to remember to set the next date after every visit.                                                                                                                                                                                                                                                                                                                    |
| **Cadence on the category, override per appointment** (chosen)                      | A static `MEDICAL_CATEGORY_CADENCE` map assigns each category a default cadence in months (dentist: 6, GP: 12, dermatology: 12, eyes: 24, others: null). The overview computes `nextDueAt` as `lastCompleted.nextDueAt ?? lastCompleted.completedAt + defaultCadence`, falling back to the next scheduled visit. Each appointment can override with its own `nextDueAt` — most flexible, minimal maintenance. Zero new tables.                         |
| **Documentarian sub-agent (records only, no advice)**                               | Safest starting point but reads as unhelpful ("noted, please see a doctor" to everything).                                                                                                                                                                                                                                                                                                                                                             |
| **Documentarian + gentle triage** (chosen)                                          | The sub-agent captures what Cem tells it into a structured record and offers low-risk practical suggestions ("if it doesn't improve in two weeks, worth showing a dermatologist"), but does NOT diagnose or prescribe. Its system prompt carries an explicit **red-flag refusal list** (chest pain, stroke signs, breathing difficulty, anaphylaxis, suicidal ideation) — on trigger it refuses to file a record and tells Cem to seek emergency care. |
| **Domain-specific `MedicalAttachments` blob table**                                 | Duplicates every consumer of `FileUploads`. Adds an upload endpoint, encoding rules, and its own cascade posture. Zero win — the existing primitive already handles chat, projects, and inventory receipts.                                                                                                                                                                                                                                            |
| **Attachments piggyback on `FileUploads` via a `MedicalRecordFiles` join** (chosen) | Same wire as inventory receipts. When Cem drops a photo into the workspace chat, it already persists as a `FileUpload` and the orchestrator sees it as a `FilePart` — the medical delegate just forwards the `fileUploadIds` so the sub-agent can attach them to the record it files, atomically, via `medicalRecordUpsert.fileUploadIds`.                                                                                                             |
| **Medications table in v1**                                                         | Its own surface — name/dose/frequency/started/ended + tools + UI. Meaningful scope; deferred until the core is proven.                                                                                                                                                                                                                                                                                                                                 |

## Option chosen

Two dedicated tables — `MedicalAppointments` and `MedicalRecords` — plus a `MedicalRecordFiles` join into the shared `FileUploads`. Both
core tables carry a `MedicalCategory` enum used for grouping and cadence. Records optionally cross-link to appointments. Attachments live on
records only in v1 (a symmetrical `MedicalAppointmentFiles` join is a follow-up if it's ever needed for lab-result PDFs on a visit).

The medical sub-agent is the primary write path. It's a **documentarian with gentle triage**, with an explicit red-flag refusal list. Manual
editing is available on the workspace page for anything the sub-agent didn't file (or that Cem wants to backdate).

## Implementation details

### Database schema

`MedicalAppointments`:

- `appointmentId uuid PK`
- `category varchar` (`dentist | gp | dermatology | eyes | mentalHealth | ent | physio | other`)
- `providerName varchar` — free-text (no dedicated provider table)
- `title varchar` required, `notes text`
- `scheduledAt timestamptz` required — intended time
- `completedAt timestamptz` — set when the visit actually happens
- `nextDueAt timestamptz` — explicit override for the "next visit" question
- `status varchar` (`scheduled | completed | cancelled | missed`), default `scheduled`
- `topics text[]` — free-form cluster tags; same shape as `Movies.topics`
- `createdAt`, `updatedAt`
- Indexes: `(category)`, `(scheduledAt)`

`MedicalRecords`:

- `recordId uuid PK`
- `category varchar` — same enum as appointments
- `title varchar` required, `summary text` required — the agent's structured writeup
- `severity varchar` nullable (`info | mild | moderate | severe`)
- `symptoms text[]`, `bodyAreas text[]` — free-form, so the vocabulary can grow without migrations
- `occurredAt timestamptz`, `resolvedAt timestamptz`
- `appointmentId uuid` FK → `MedicalAppointments.appointmentId`, **`ON DELETE SET NULL`** — records survive appointment cleanup
- `topics text[]`, `createdAt`, `updatedAt`
- Indexes: `(category)`, `(appointmentId)`, `(occurredAt)`

`MedicalRecordFiles`:

- `recordFileId uuid PK`
- `recordId uuid` FK → `MedicalRecords.recordId`, **`ON DELETE CASCADE`**
- `fileUploadId uuid` FK → `FileUploads.fileUploadId`, **`ON DELETE CASCADE`** (same posture as `ItemFiles`)
- `label varchar`, `pinned boolean` default false
- `createdAt`, `updatedAt`
- Indexes: `(recordId, pinned)`, `(fileUploadId)`

Migration: `drizzle/0019_special_thor.sql`.

### GraphQL

Read namespace under `Admin.medical` (reached via `currentSession.user.admin.medical`):

- `appointments: [MedicalAppointment!]!` — every appointment; ordered `scheduled` first (soonest first), then everything else by
  `scheduledAt DESC`
- `records: [MedicalRecord!]!` — every record; ordered by `occurredAt DESC` (falling back to `createdAt`), files pre-joined
- `overview: [MedicalCategoryOverview!]!` — one row per `MedicalCategory` with `defaultCadenceMonths`, `lastCompletedAt`, `nextDueAt`,
  `isOverdue`, `upcoming: [MedicalAppointment!]!`, `recentRecords: [MedicalRecord!]!`. Cadence math lives in `medicalCategoryOverview.ts`;
  categories with no data still surface so the overview grid never has holes.

Write mutations on `AdminMutation`:

- `medicalAppointmentUpsert(input: MedicalAppointmentInput!): MedicalAppointment!` — create or edit an appointment
- `medicalAppointmentDelete(appointmentId: ID!): MutationResult!`
- `medicalAppointmentComplete(appointmentId: ID!, completedAt: DateTime, nextDueAt: DateTime): MedicalAppointment!` — shortcut for "I just
  went to the dentist"; flips status, stamps `completedAt`, optionally writes the follow-up
- `medicalRecordUpsert(input: MedicalRecordInput!): MedicalRecord!` — the primary write. Accepts optional `fileUploadIds: [ID!]` that get
  attached inline in the same transaction (validated against user ownership up-front, same shape as `chatMessageCreate`)
- `medicalRecordDelete(recordId: ID!): MutationResult!` — cascade removes join rows; `FileUploads` bytes stay put
- `medicalRecordFileAttach(input: MedicalRecordFileAttachInput!): MedicalRecordFile!` — attach a file to an existing record
- `medicalRecordFileDelete(recordFileId: ID!): MutationResult!`

No per-resolver guards. Gating happens once at `Mutation.admin` via `guardAdminMutation`, matching the media / inventory pattern.

### Cadence configuration

Defined in `src/server/agents/medicalCategoryCadence.ts`:

```ts
export const MEDICAL_CATEGORY_CADENCE: Record<MedicalCategory, number | null> = {
  dentist: 6,
  gp: 12,
  dermatology: 12,
  eyes: 24,
  mentalHealth: null, // no recurring cadence — book when needed
  ent: null,
  physio: null,
  other: null,
};
```

The overview query and the sub-agent's snapshot both read from this map. `null` means "no recurring cadence"; only the explicit `nextDueAt`
on the last completed visit surfaces a next-due date for those categories.

### Route

`src/routes/{-$locale}/workspace/medical.tsx`. Three tabs (Overview / Appointments / Records) selected via `?tab=…`, deep-linkable per row
via `?focus=<id>`. `useWorkspaceMedicalPageLiveUser` is the seed-and-subscribe hook — the route loader seeds `currentSession.user`, then the
`WorkspaceMedicalPageUpdates` subscription replaces it on every server push. Every mutation publishes on the user channel, so mutations
never re-fetch from the client.

`max-w-8xl`, `noindex: true`, `WorkspaceUnauthorized` fallback when `user.admin === null`.

Bilingual labels (`CATEGORY_LABELS`, `APPOINTMENT_STATUS_LABELS`, `SEVERITY_LABELS`) stay colocated with the page — the media / inventory
convention for enum labels.

### Medical sub-agent

- **`agentPersonalAssistantMedical.ts`** — `ToolLoopAgent` factory. System prompt is a large block that: (a) pins the role to
  documentarian + gentle triage, (b) forbids diagnosis / prescription, (c) lists red-flag symptoms and instructs the agent to refuse to file
  a record and instead direct Cem to emergency care, (d) explains each of the nine tools, (e) embeds a live medical snapshot.
  `stopWhen: [isStepCount(10)]`, model pinned to `ADMIN_CHAT_MODEL_FALLBACK_ID`.
- **`medicalSnapshotForAgent.ts`** — compact per-category markdown snapshot. Pre-computes cadence, last-visit, next-due, upcoming visits,
  and recent records so the agent sees "next due: 2026-01-15 ⚠️ OVERDUE" inline instead of computing it itself.
- **`toolDelegateToMedical.ts`** — orchestrator-side delegate. Persists the parent `chatMessagesToolCall` row, closes over a
  `MedicalAgentMutation[]` log, forwards `onStepEnd`. Optional `fileUploadIds` input; when present, the ids are appended to the sub-agent's
  brief so it can pass them straight through on `medicalRecordUpsert.fileUploadIds`.
- **Per-tool wrappers** (nine total):
  - Reads: `toolMedicalOverview`, `toolMedicalAppointmentsList`, `toolMedicalRecordsList`
  - Writes: `toolMedicalAppointmentUpsert`, `toolMedicalAppointmentComplete`, `toolMedicalAppointmentDelete`, `toolMedicalRecordUpsert`
    (accepts `fileUploadIds`), `toolMedicalRecordDelete`, `toolMedicalRecordFileAttach`
  - Every write tool pushes a `MedicalAgentMutation` (`{ kind, id, title? }`) into the shared array; the delegate returns them as part of
    the tool result so the orchestrator can render deep-links via its templates.

### Attachments — the chat → record wire

The end-to-end flow when Cem pastes a photo of a rash into the workspace chat and asks about it:

1. **Composer**: `uploadFile()` (`src/web/chat/fileUpload.ts`) POSTs the bytes to `/api/file-uploads` — a `FileUploads` row is created,
   owned by Cem.
2. **`chatMessageCreate`**: the user message persists with the `fileUploadId` in `ChatMessageUserAttachments`. `toModelMessages`
   materializes the bytes as a `FilePart` on the user message.
3. **Orchestrator turn**: `agentPersonalAssistant` sees the message + `FilePart`, identifies the health topic, and calls
   `delegateToMedical({ brief: '…', fileUploadIds: [<id>] })`. The `brief` can include a brief description of what the photo shows.
4. **`toolDelegateToMedical`**: appends the `fileUploadIds` to the sub-agent's brief text and hands off.
5. **Sub-agent**: asks clarifying questions if needed (via the `needsMoreInfo` sentinel), then calls `medicalRecordUpsert` with
   `fileUploadIds: [<id>]`. The command validates ownership, inserts the record, and inserts the `MedicalRecordFiles` join row atomically.
6. **UI**: the medical page's `userUpdates` subscription pushes the new record; the Records tab renders the photo thumbnail on the card.

## Deferred / follow-ups

- **Medications table** — its own surface (name / dose / frequency / started / ended) with tools and a section in the overview.
- **`MedicalProvider` directory** — dedicated table with contact info and per-provider notes; appointments FK into it.
- **`MedicalAppointmentFiles`** — symmetrical join so lab-result PDFs can attach to a visit instead of a record.
- **Overdue-reminder job** — a `pg-boss` job that fires on overdue categories and pings the assistant to nudge Cem.
- **Calendar view** of upcoming appointments — waiting on `/workspace/calendar` to exist.
