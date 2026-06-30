# Profile

AI-built profile of Cem, fed continuously by an analyzer that watches the workspace personal-assistant chat and synthesized periodically
into three text artifacts. Surfaces at `/workspace/profile`.

## User behavior

There are two surfaces and one firewall.

**`/workspace/profile`** — Cem's read-only insight page. Three tabs (Summary / Portrait / Psychological), an observations stream beneath
them with category filters and dismiss, plus a "Re-synthesize now" button.

**Inline observation pill below admin chat messages** — when the analyzer extracts observations from a user message, a small pill appears
below it. Clicking expands the captured lines; a "Open profile →" link deep-links to the page.

**The firewall** — exactly one artifact crosses back into a prompt: `summary`. `prose` and `psychProfile` are read-only insight surfaces
that the personal assistant never sees. The boundary is enforced by storage separation (only `profileSummaryGet` reads what the agent
injects), not by hoping a prompt holds.

## Options considered

### Storage shape

Three options were on the table.

1. **Single markdown file in the existing `FileUploads` table.** Cheapest. No new tables, no migrations. Rejected: `FileUploads` is keyed by
   `userId` with cascading delete, has no relation to chat messages, and treats bytes as opaque. The profile needs structured access
   (per-observation dismiss, per-category filter, source-message join), all of which would degrade to "parse the markdown" without proper
   rows.
2. **One JSONB column on a singleton row.** A middle path — schema-stable, no joins. Rejected: loses the FK from observation to source
   `chatMessageId`, loses per-observation indexes, and makes partial mutations (dismiss one observation) into read-modify-write of the whole
   blob.
3. **Dedicated tables (chosen).** Three: `Profile` (singleton, four text fields + bookkeeping), `ProfileObservations` (one row per
   observation, FK to the source message), `ProfileMessageAnalysis` (idempotency log so the analyzer doesn't re-run on redelivery). Adds a
   migration, but matches the existing CQRS pattern the rest of the workspace uses ([content-model.md](../architecture/content-model.md))
   and makes every read path obvious.

### Analyzer trigger

1. **Tool call inside the agent loop.** The agent calls a `logPsychologicalObservation` tool when it sees something worth logging. Rejected:
   the agent grades its own conversation (self-reinforcement bias), every turn pays the reasoning cost whether or not the message reveals
   anything, and the resulting tool-call rows would be in the model's transcript on subsequent turns — breaking the firewall.
2. **Background job per admin user message (chosen).** A `profileAnalyze` job enqueued from `chatMessageCreate` for `scope = 'admin'` only.
   Runs out-of-loop with a separate prompt and a smaller model. The analyzer sees no assistant reasoning (only user messages), produces zero
   observations by default unless something genuinely new shows up, and never feeds back into the chat agent.
3. **Cron over unprocessed messages.** Simpler enqueue (no per-message hook), batch reasoning over multiple messages. Rejected: observations
   lag the conversation; also loses temporal context — analyzing "what was on his mind" hours after the fact misses the moment.

### Synthesizer trigger

Mixed strategy: auto-run when `Profile.observationsSinceSynthesis ≥ PROFILE_SYNTHESIS_THRESHOLD` (10), or on explicit "Re-synthesize now"
from `/workspace/profile`. No cron — the workspace is low-volume enough that idle weeks shouldn't burn token budget on the smarter model.

### Language

English only. Synthesis writes English; the analyzer asks for English observation text even when the source message is German. This is the
only place in the project that intentionally diverges from the bilingual `*De` / `*En` convention ([conventions.md](../conventions.md)).
Rationale: the data is private and unindexed, the LLM is more reliable in one language, and the injected summary needs to be
language-deterministic (rather than "whichever language dominated the recent observations").

### Visibility in the chat thread

Inline pill rendered below the user message when observations exist. Three options considered:

1. **Silent** — page-only, no chat-side hint. Cleanest chat, but easy to miss; transparency value lost.
2. **Tool-call rendering** — make the analyzer look like a tool call, render via the existing `ChatMessageToolCall` variant. Rejected:
   tool-call rows are replayed into the LLM on subsequent turns; this is the firewall the design is built around.
3. **Inline pill (chosen)** — a separate component below the bubble, populated from the user message's `profileObservations` field on the
   GraphQL read.

## Implementation

### Schema

Three tables in `src/server/db/schema.ts`:

```text
Profile                                       -- singleton row
  profileId PK
  summary, prose, psychProfile text
  synthesizedAt timestamp?
  synthesisModelId varchar?
  observationsSinceSynthesis int
  createdAt, updatedAt timestamp

ProfileObservations
  observationId PK
  sourceChatMessageId FK → ChatMessages.chatMessageId (ON DELETE SET NULL)
  category varchar  -- 'factual' | 'behavioral' | 'psychological'
  content text
  confidence int?   -- 0..100 percent
  analyzerModelId varchar?
  dismissedAt timestamp?  -- soft delete
  createdAt timestamp
  indexes: (category, createdAt), sourceChatMessageId, createdAt

ProfileMessageAnalysis                        -- idempotency log
  chatMessageId PK FK → ChatMessages.chatMessageId (ON DELETE CASCADE)
  observationsCreated int
  analyzerModelId varchar?
  analyzedAt timestamp
```

`PROFILE_SINGLETON_ID` is a fixed UUID constant in `src/server/agents/profileConfig.ts`. Phase 2 (per-user accounts) keeps it for "the
owner's profile" and derives a fresh id per registered user.

### Server code

```text
src/server/agents/
  profileConfig.ts                    PROFILE_SINGLETON_ID, PROFILE_SYNTHESIS_THRESHOLD
  agentPersonalAssistant.ts           reads profileSummaryGet, prepends to instructions

src/server/queries/
  profileGet.ts                       seed-or-load the singleton row
  profileSummaryGet.ts                FIREWALL ANCHOR — the only path that exposes profile data into a prompt
  profileObservationList.ts           list + per-message lookup

src/server/commands/
  profileObservationCreate.ts         called only by the analyzer job
  profileObservationDismiss.ts        AdminMutation.profileObservationDismiss
  profileSynthesizeRequest.ts         AdminMutation.profileSynthesizeRequest (enqueue only)

src/server/mappers/
  toGqlProfile.ts
  toGqlProfileObservation.ts

src/server/jobs/handlers/
  profileAnalyze.ts                   queued job, per admin user message
  profileSynthesize.ts                queued job, threshold- or manually-triggered
```

### Chat-side wiring

- `chatMessageCreate` (admin path) enqueues `profileAnalyze` after the assistant turn fires. Fire-and-forget — enqueue failures are logged
  but never block the chat.
- `chatMessageRowsLoad` bulk-loads active observations for every user-message id in a chat, mirroring how `userAttachments` is loaded.
  Visitor messages get an empty list (the analyzer never runs there).
- `ChatMessageUser` GraphQL type carries `profileObservations: [ProfileObservation!]!`. The `ChatPage.graphql` and
  `WorkspaceAssistantPage.graphql` fragments both select it; the inline pill component renders from it.

### Analyzer job

Per admin user-message:

1. Idempotency check via `ProfileMessageAnalysis`.
2. Load the target message body plus the last 6 user messages in the same chat as rolling context (user-side only — sending in assistant
   turns would bias the analyzer).
3. `generateText` with `Output.object({ schema })` against `serverRuntime.ai.profileAnalyzerModel()` (Gemini 2.5 Flash by default), Zod
   schema asking for zero or more observations.
4. Prompt explicitly: "RETURN AN EMPTY ARRAY when nothing reveals anything new."
5. Persist each observation; record the analysis row.
6. If `observationsSinceSynthesis ≥ PROFILE_SYNTHESIS_THRESHOLD`, enqueue `profileSynthesize`.

Failures are logged and swallowed — the chat path has already returned.

### Synthesizer job

1. Load all non-dismissed observations + the prior profile.
2. `generateText` with `Output.object({ schema })` against `serverRuntime.ai.profileSynthesizerModel()` (Gemini 2.5 Pro by default), Zod
   schema asking for `{ summary, prose, psychProfile }`.
3. Prompt is treated as a refinement, not a regenerate — prior profile is included and "treat as a draft you are refining" is in the
   instructions.
4. Write all four fields plus `synthesizedAt`, `synthesisModelId`, reset `observationsSinceSynthesis` to 0.

### Synthesis liveness

The "Re-synthesize now" button on `/workspace/profile` reflects whether the job is actually running, not a hand-tuned timeout.
`AdminProfile.synthesisInProgress` is a derived boolean resolved by `profileSynthesisInProgressGet`, which asks pg-boss (via
`serverRuntime.jobs.activeCount(profileSynthesize)`) whether a job for the `profile-synthesize` queue is currently in `created` | `retry` |
`active`. Nothing on the `Profile` row tracks this — pg-boss is the single source of truth and auto-expires stuck `active` rows after each
job's `expireInSeconds`, so a worker crash cannot leave the spinner stuck on. While the flag is `true`, the page polls the route loader
every ~1.5s and stops the moment pg-boss reports the queue is clear.

### Firewall

The boundary is one query: `profileSummaryGet` in `src/server/queries/profileSummaryGet.ts`. It selects only `Profile.summary`. The agent
factory calls it; nothing else does. `prose` and `psychProfile` are reachable only through `Admin.profile` on the read namespace, which is
reached via `currentSession.user.admin` (non-null only for admin sessions) and never read by any agent.

If you ever feel the urge to widen `profileSummaryGet`, don't. Add a new query.

## Page surface

`/workspace/profile`:

- **Synthesis hero** — three-tab strip (Summary / Portrait / Psychological), tab-specific explainer text ("This text is injected" vs. "Yours
  only" vs. "Firewalled"), markdown-rendered body, and a "Re-synthesize now" button.
- **Observations stream** — category filter chips (All / Factual / Behavioral / Psychological), a "Show dismissed" toggle, then a vertical
  list of observation cards with: category chip, confidence dots, age, content, "View source" deep-link to the originating chat, and a
  "Dismiss" button.

Bilingual UI copy (DE/EN) follows the inline `{ de, en }[locale]` pattern; the synthesized artifacts themselves are English-only.

## Consequences

- `chatMessageCreate` does one extra enqueue on admin-scope sends. Cheap; never blocks.
- The chat read query is slightly heavier — one extra bulk `IN` query for observations. Bounded by user-message count per chat.
- `agentPersonalAssistant` does one extra `SELECT summary FROM Profile WHERE profileId = ...` per admin turn. ~1ms; never enters the LLM
  prompt-building hot path.
- The DB grows one row per admin user message that revealed something, plus one row per analyzed message. No retention policy in Phase 1 —
  admin chats are low-volume.
- `ServerRuntime.ai` gains two model factories (`profileAnalyzerModel`, `profileSynthesizerModel`). The test stub returns
  `MockLanguageModelV3` for each so existing command tests don't touch real LLMs.
- Tests for the analyzer/synthesizer are deferred; they're job handlers reading the same shape as commands and the model is stubbed via the
  existing utilities when needed.

## Phase 2 follow-ups

- Per-user profiles once GitHub OAuth lands. Today's `PROFILE_SINGLETON_ID` becomes "the owner's id" and new users get fresh rows.
- Optional weekly cron synthesis as a backstop for idle weeks (currently only threshold + manual).
- "Undismiss" mutation if Cem changes his mind on an observation.
- Possibly a low-frequency analyzer pass over assistant messages once their reasoning is rich enough to be informative (today: avoided to
  prevent hall-of-mirrors bias).
