# Compass

AI-built compass of the admin, fed continuously by an analyzer that watches the workspace personal-assistant chat and synthesized
periodically into three text artifacts. Surfaces at `/workspace/compass`.

The name has shifted from "profile" to "compass" — the feature is not a static fact list. It is an evolving sense of "where am I right now,
where am I drifting", grounded in observations the analyzer captures from admin chats. Future work adds a recurring psychological-interview
agent that _draws out_ new bearings on a cadence (see "Phase 2 follow-ups"); both surfaces share the same observations / synthesis pipeline.

## User behavior

There are two surfaces and one firewall.

**`/workspace/compass`** — the admin's read-only insight page. Three tabs (Summary / Portrait / Psychological), an observations stream
beneath them with category filters and dismiss, plus a "Re-synthesize now" button.

**Inline observation pill below admin chat messages** — when the analyzer extracts observations from a user message, a small pill appears
below it. Clicking expands the captured lines; an "Open compass →" link deep-links to the page.

**The firewall** — exactly one artifact crosses back into a prompt: `summary`. `prose` and `psychology` are read-only insight surfaces that
the personal assistant never sees. The boundary is enforced by storage separation (only `compassSummaryFindOne` reads what the agent
injects), not by hoping a prompt holds.

## Options considered

### Storage shape

Three options were on the table.

1. **Single markdown file in the existing `FileUploads` table.** Cheapest. No new tables, no migrations. Rejected: `FileUploads` is keyed by
   `userId` with cascading delete, has no relation to chat messages, and treats bytes as opaque. The compass needs structured access
   (per-observation dismiss, per-category filter, source-message join), all of which would degrade to "parse the markdown" without proper
   rows.
2. **One JSONB column on a singleton row.** A middle path — schema-stable, no joins. Rejected: loses the FK from observation to source
   `chatMessageId`, loses per-observation indexes, and makes partial mutations (dismiss one observation) into read-modify-write of the whole
   blob.
3. **Dedicated tables (chosen).** Three: `Compass` (singleton, three text fields + bookkeeping), `CompassObservations` (one row per
   observation, FK to the source message), `CompassMessageAnalysis` (idempotency log so the analyzer doesn't re-run on redelivery). Adds a
   migration, but matches the existing CQRS pattern the rest of the workspace uses ([content-model.md](../architecture/content-model.md))
   and makes every read path obvious.

### Analyzer trigger

1. **Tool call inside the agent loop.** The agent calls a `logPsychologicalObservation` tool when it sees something worth logging. Rejected:
   the agent grades its own conversation (self-reinforcement bias), every turn pays the reasoning cost whether or not the message reveals
   anything, and the resulting tool-call rows would be in the model's transcript on subsequent turns — breaking the firewall.
2. **Background job per admin user message (chosen).** A `compassAnalyze` job enqueued from `chatMessageCreate` for `scope = 'admin'` only.
   Runs out-of-loop with a separate prompt and a smaller model. The analyzer sees no assistant reasoning (only user messages), produces zero
   observations by default unless something genuinely new shows up, and never feeds back into the chat agent.
3. **Cron over unprocessed messages.** Simpler enqueue (no per-message hook), batch reasoning over multiple messages. Rejected: observations
   lag the conversation; also loses temporal context — analyzing "what was on their mind" hours after the fact misses the moment.

### Synthesizer trigger

Mixed strategy: auto-run when `Compass.observationsSinceSynthesis ≥ COMPASS_SYNTHESIS_THRESHOLD` (10), or on explicit "Re-synthesize now"
from `/workspace/compass`. No cron — the workspace is low-volume enough that idle weeks shouldn't burn token budget on the smarter model.

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
3. **Inline pill (chosen)** — a separate component below the bubble, populated from the user message's `compassObservations` field on the
   GraphQL read.

## Implementation

### Storage

Three tables in `src/server/db/schema.ts`:

```text
Compass                                       -- singleton row
  compassId PK
  summary, prose, psychology text
  synthesizedAt timestamp?
  synthesisModelId varchar?
  observationsSinceSynthesis int
  scheduledInterviewTopic varchar?   -- AI-suggested next interview topic
  scheduledInterviewAt    timestamp? -- when the hint fires
  scheduledInterviewReason text?     -- one-sentence rationale from the analyzer
  createdAt, updatedAt timestamp

CompassObservations
  observationId PK
  sourceChatMessageId FK → ChatMessages.chatMessageId (ON DELETE SET NULL)
  category varchar  -- 'factual' | 'behavioral' | 'psychological'
  content text
  confidence int?   -- 0..100 percent
  analyzerModelId varchar?
  dismissedAt timestamp?  -- soft delete
  createdAt timestamp
  indexes: (category, createdAt), sourceChatMessageId, createdAt

CompassMessageAnalysis                        -- idempotency log
  chatMessageId PK FK → ChatMessages.chatMessageId (ON DELETE CASCADE)
  observationsCreated int
  analyzerModelId varchar?
  analyzedAt timestamp
```

`COMPASS_SINGLETON_ID` is a fixed UUID constant in `src/server/agents/compassConfig.ts`. Phase 2 (per-user accounts) keeps it for "the
owner's compass" and derives a fresh id per registered user.

### Server code

```text
src/server/agents/
  compassConfig.ts                    COMPASS_SINGLETON_ID, COMPASS_SYNTHESIS_THRESHOLD
  agentPersonalAssistant.ts           reads compassSummaryFindOne, prepends to instructions

src/server/queries/
  adminCompassFindOne.ts                      seed-or-load the singleton row
  compassSummaryFindOne.ts                FIREWALL ANCHOR — the only path that exposes compass data into a prompt
  adminCompassObservationFindMany.ts           list + per-message lookup

src/server/commands/
  compassObservationCreate.ts         called only by the analyzer job
  compassObservationDismiss.ts        AdminMutation.compassObservationDismiss
  compassSynthesizeRequest.ts         AdminMutation.compassSynthesizeRequest (enqueue only)

src/server/mappers/
  toGqlCompass.ts
  toGqlCompassObservation.ts

src/server/jobs/handlers/
  compassAnalyze.ts                   queued job, per admin user message
  compassSynthesize.ts                queued job, threshold- or manually-triggered
```

### Chat-side wiring

- `chatMessageCreate` (admin path) enqueues `compassAnalyze` after the assistant turn fires. Fire-and-forget — enqueue failures are logged
  but never block the chat.
- `chatMessageFindMany` bulk-loads active observations for every user-message id in a chat, mirroring how `userAttachments` is loaded.
  Visitor messages get an empty list (the analyzer never runs there).
- `ChatMessageUser` GraphQL type carries `compassObservations: [CompassObservation!]!`. The `ChatPage.graphql` and
  `WorkspaceAssistantPage.graphql` fragments both select it; the inline pill component renders from it.

### Analyzer job

Per admin user-message:

1. Idempotency check via `CompassMessageAnalysis`.
2. Load the target message body plus the last 6 user messages in the same chat as rolling context (user-side only — sending in assistant
   turns would bias the analyzer).
3. `generateText` with `Output.object({ schema })` against `serverRuntime.ai.compassAnalyzerModel()` (Gemini 2.5 Flash by default), Zod
   schema asking for zero or more observations.
4. Prompt explicitly: "RETURN AN EMPTY ARRAY when nothing reveals anything new."
5. Persist each observation; record the analysis row.
6. If `observationsSinceSynthesis ≥ COMPASS_SYNTHESIS_THRESHOLD`, enqueue `compassSynthesize`.

Failures are logged and swallowed — the chat path has already returned.

### Synthesizer job

1. Load all non-dismissed observations + the prior compass.
2. `generateText` with `Output.object({ schema })` against `serverRuntime.ai.compassSynthesizerModel()` (Gemini 3.6 Flash with high thinking
   by default), Zod schema asking for `{ summary, prose, psychology }`.
3. Prompt is treated as a refinement, not a regenerate — prior compass is included and "treat as a draft you are refining" is in the
   instructions.
4. Write all three fields plus `synthesizedAt`, `synthesisModelId`, reset `observationsSinceSynthesis` to 0.

### Synthesis liveness

The "Re-synthesize now" button on `/workspace/compass` reflects whether the job is actually running, not a hand-tuned timeout.
`AdminCompass.synthesisInProgress` is a derived boolean resolved by `adminCompassSynthesisInProgressFindOne`, which asks pg-boss (via
`serverRuntime.jobs.activeCount(compassSynthesize)`) whether a job for the `compass-synthesize` queue is currently in `created` | `retry` |
`active`. Nothing on the `Compass` row tracks this — pg-boss is the single source of truth and auto-expires stuck `active` rows after each
job's `expireInSeconds`, so a worker crash cannot leave the spinner stuck on. While the flag is `true`, the page polls the route loader
every ~1.5s and stops the moment pg-boss reports the queue is clear.

### Firewall

The boundary is one query: `compassSummaryFindOne` in `src/server/queries/compassSummaryFindOne.ts`. It selects only `Compass.summary`. The
agent factory calls it; nothing else does. `prose` and `psychology` are reachable only through `Admin.adminCompassFindOne` on the read
namespace, which is reached via `sessionFindOne.user.admin` (non-null only for admin sessions) and never read by any agent.

If you ever feel the urge to widen `compassSummaryFindOne`, don't. Add a new query.

## Page surface

`/workspace/compass`:

- **Synthesis hero** — four-tab underlined section-tab bar (Summary / Portrait / Psychological / Interviews) matching the workspace's
  canonical top-of-page switcher (see [conventions.md](../conventions.md#top-of-page-sub-view-switcher)), tab-specific explainer text ("This
  text is injected" vs. "Yours only" vs. "Firewalled"), markdown-rendered body, and a "Re-synthesize now" button.
- **Observations stream** — category filter chips (All / Factual / Behavioral / Psychological), a "Show dismissed" toggle, then a vertical
  list of observation cards with: category chip, confidence dots, age, content, "View source" deep-link to the originating chat, and a
  "Dismiss" button.

Bilingual UI copy (DE/EN) follows the inline `{ de, en }[locale]` pattern; the synthesized artifacts themselves are English-only.

## Consequences

- `chatMessageCreate` does one extra enqueue on admin-scope sends. Cheap; never blocks.
- The chat read query is slightly heavier — one extra bulk `IN` query for observations. Bounded by user-message count per chat.
- `agentPersonalAssistant` does one extra `SELECT summary FROM Compass WHERE compassId = ...` per admin turn. ~1ms; never enters the LLM
  prompt-building hot path.
- The DB grows one row per admin user message that revealed something, plus one row per analyzed message. No retention policy in Phase 1 —
  admin chats are low-volume.
- `ServerRuntime.ai` gains three model factories (`compassAnalyzerModel`, `compassSynthesizerModel`, `compassInterviewerModel`). The test
  stub returns `MockLanguageModelV3` for each so existing command tests don't touch real LLMs.
- Tests for the analyzer/synthesizer are deferred; they're job handlers reading the same shape as commands and the model is stubbed via the
  existing utilities when needed.

## Psychological-interview agent

The passive analyzer can only see what the admin volunteers to their personal assistant. Topics they don't naturally bring up (mood, recent
stressors, goals shifting, things weighing on them) never land in the picture, and the picture stales as their life moves on. The interview
agent fixes that: a recurring job creates a "due" interview, the admin opens it from `/workspace/compass`, an interviewer agent asks 4–8
directed questions, replies feed the same observations / synthesis pipeline as everything else. The name "compass" was chosen partly to
accommodate this — an interview is a way to _take a bearing_.

### User behavior

A new **Interviews** tab on `/workspace/compass`, alongside Summary / Portrait / Psychological. Three states:

1. No open interview → quiet empty state explaining the cadence plus a "Start a new interview" button for an off-cycle start.
2. Open interview waiting (`pending`) → prominent card with "Start interview" / "Skip". A small amber dot on the tab itself flags that
   something is waiting so the admin sees it from any of the other tabs.
3. Active interview (`in_progress`) → transcript + composer (pinned by `?interviewId=…`); the agent asks one question per turn, the admin
   replies, the agent decides when it has enough and calls `concludeInterview`. They can also click "End interview" any time.

Beneath all three states sits a quiet "Past interviews" rail with status, due-date, and observation count per row.

### Options considered

#### Storage

- **Dedicated tables (chosen).** `CompassInterviews` + `CompassInterviewMessages` + `CompassInterviewMessageAnalysis`. Keeps `chats.scope`
  strictly `'public' | 'admin'` (the access-path-driven visitor / admin split — see [`docs/architecture/chat.md`](../architecture/chat.md)),
  and gives the interview row its own status / dueAt / endReason fields. Interview turns don't need approval, tool-call persistence,
  generations, or input collection — a flat user/assistant log is enough. Turns _do_ stream (see below), but through a parallel
  `compassInterviewUpdates` subscription rather than the chat one.
- **Reusing `Chats` with a new scope.** Rejected. Adding a third value contradicts the binary access-path dispatch and would force scope
  checks at every chat command call site.

#### Trigger

- **Recurring `compassInterviewScheduledDue` cron + pull-based page prompt (chosen).** Cadence is set by `COMPASS_INTERVIEW_CRON` in
  `src/server/agents/compassInterviewConfig.ts` — currently daily at 09:00 server time (`0 9 * * *`). That constant is the single source of
  truth; the DB / GraphQL `triggerReason` is deliberately cadence-neutral (`scheduled` vs `manual`) so shifting the interval is a one-line
  change. Idempotent: the handler short-circuits if a `pending` or `in_progress` interview already exists, so a missed tick (worker offline,
  admin busy) just resumes on the next one — pending rows never pile up. No email or push notification — the admin sees the waiting card
  next time they open the page.
- **Manual-only.** Rejected as the sole trigger — defeats the "refresh the picture on a cadence" goal. But the manual trigger _does_ ship
  alongside the cron as an off-cycle escape hatch: a "Start a new interview" button on the `NoInterviewCard` calls
  `AdminMutation.compassInterviewStartNow` (see `src/server/commands/compassInterviewStartNow.ts`), which inserts a `pending` row with
  `triggerReason='manual'` under the same "at most one open interview" guard as the cron.
- **Email / push notification.** Rejected. Pulls are calm; pushes are not. Can revisit if the cadence rises.

#### Firewall stance (the deliberate exception)

The personal assistant still reads only `Compass.summary` (via `compassSummaryFindOne`). The interview agent — and **only** the interview
agent — sees `summary` + `psychology` + recent non-dismissed observations, because its whole job is to probe gaps in the existing picture
without repeating itself. Without `psychology` and recent observations it would ask redundant questions every cadence.

The widening is anchored in exactly one query:

```text
src/server/queries/compassInterviewContextFindOne.ts   ← FIREWALL EXCEPTION ANCHOR
                                                     called only by agentCompassInterviewer
```

If you find yourself wanting another reader of this richer slice — don't. Write a narrower query.

### Implementation

Schema (`src/server/db/schema.ts`):

```text
CompassInterviews
  interviewId PK
  status        varchar  -- 'pending' | 'in_progress' | 'completed' | 'skipped'
  dueAt, startedAt?, completedAt?
  endReason     varchar?  -- 'agent_satisfied' | 'user_ended' | 'skipped'
  triggerReason varchar   -- 'scheduled' | 'manual'
  topic         varchar   -- 'general' | 'career' | 'relationships' | 'fitness' | 'health' | 'stress'
                          --   drives per-topic system-prompt injection in agentCompassInterviewer
  observationCount int    -- denormalized; bumped by the analyzer
  indexes: (status, dueAt), createdAt

CompassInterviewMessages
  interviewMessageId PK
  interviewId FK → CompassInterviews (ON DELETE CASCADE)
  role varchar -- 'user' | 'assistant'
  content text, modelId varchar?, createdAt
  index: (interviewId, createdAt)

CompassInterviewMessageAnalysis        -- idempotency log, mirrors CompassMessageAnalysis
  interviewMessageId PK FK → CompassInterviewMessages (CASCADE)
  observationsCreated int, analyzerModelId, analyzedAt
```

`CompassObservations.sourceChatMessageId` was widened with a sibling `sourceInterviewMessageId` (FK SET NULL, exactly one of the two set per
row). The mapper exposes both plus the resolved parent ids so the page can deep-link from any observation back into its source thread.

Code:

```text
src/server/agents/
  compassInterviewConfig.ts          cron expression, min/max question counts, recent-obs cap
  agentCompassInterviewer.ts         the interview agent — one turn per call, single tool
                                     `concludeInterview`. Reads compassInterviewContextFindOne.

src/server/queries/
  adminCompassInterviewFindOne.ts             load one interview + its messages
  adminCompassInterviewFindMany.ts            newest-first list for the past-interviews rail
  adminCompassInterviewPendingFindOne.ts    the single open interview (pending or in_progress)
  compassInterviewContextFindOne.ts      FIREWALL EXCEPTION ANCHOR

src/server/commands/
  compassInterviewStart.ts           pending → in_progress; runs the agent's opening turn
  compassInterviewStartNow.ts        inserts a fresh `pending` row with triggerReason='manual'
                                     and the caller-supplied topic (defaults to 'general').
                                     Shares the "at most one open interview" guard with the cron
                                     (returns the existing id if one is already open).
  compassScheduledInterviewDismiss.ts clears Compass.scheduledInterview* fields; called when
                                     the admin dismisses the AI-suggested hint without acting.
  compassInterviewMessageSend.ts     appends user msg; runs one agent turn; enqueues
                                     compassAnalyze fire-and-forget; transitions to
                                     'completed' if the agent called concludeInterview.
  compassInterviewEnd.ts             user-initiated end (endReason='user_ended')
  compassInterviewSkip.ts            pending → skipped

src/server/jobs/handlers/
  compassInterviewScheduledDue.ts    RecurringJobDefinition, cron driven by
                                     COMPASS_INTERVIEW_CRON (currently '0 9 * * *').
                                     Idempotent — short-circuits when an open row exists.
  compassAnalyze.ts                  Extended: accepts { chatMessageId } | { interviewMessageId };
                                     branches on which idempotency table / context block / source
                                     FK to use. The interview branch loads BOTH user + assistant
                                     turns as rolling context (the interviewer's question is
                                     exactly what gives the reply its meaning).
```

### Interview topics

Each interview has a `topic` field (`general | career | relationships | fitness | health | stress`) stored on `CompassInterviews`. The topic
drives a per-topic section injected into the interviewer's system prompt, narrowing its question angles for that session:

- `general` — broad check-in, varies freely (mood, energy, work focus, relationships, stressors)
- `career` — current projects, upcoming decisions, job satisfaction, career direction
- `relationships` — close relationships, social energy, friction, loneliness vs. connection
- `fitness` — current routine, energy levels, sleep quality, physical goals
- `health` — recent health events, concerns, diet, medical follow-ups
- `stress` — current stressors, mental load, coping, procrastination, recurring thoughts

The per-topic prompt lines live in `COMPASS_INTERVIEW_TOPIC_PROMPTS` in `src/server/agents/compassInterviewConfig.ts`.

### Cron topic selection and smart scheduling

The cron handler (`compassInterviewScheduledDue`) picks the topic for each scheduled interview in priority order:

1. **AI-suggested hint** — if `Compass.scheduledInterviewAt` is in the past (due), use `Compass.scheduledInterviewTopic` and clear the three
   hint fields after inserting the row.
2. **Rotation fallback** — look at the last completed/skipped interview's topic and take the next entry in
   `COMPASS_INTERVIEW_TOPIC_ROTATION`. The rotation is
   `['general', 'career', 'general', 'relationships', 'general', 'fitness', 'general', 'health', 'general', 'stress']` — general appears
   every other slot so broad check-ins remain frequent.

**AI-driven hints** are emitted by the analyzer (`compassAnalyze`) when a message contains a time-sensitive signal (upcoming career
decision, concrete deadline, acute stressor). The analyzer extends `OBSERVATION_SCHEMA` with an optional
`scheduleHint: { topic, daysFromNow, reason }` field; when set, it updates `Compass.scheduledInterviewTopic/At/Reason` only if the new hint
fires sooner than the current one (or no hint exists). The hint is shown as a suggestion card on `/workspace/compass` — the admin can start
it immediately or dismiss it. "Start now" calls `compassInterviewStartNow(topic)` and immediately starts the interview. "Dismiss" calls
`compassScheduledInterviewDismiss`, which clears the three fields.

### User behavior — topic picker

The **Interviews** tab `NoInterviewCard` now shows a 2×3 grid of topic cards (icon + label). Clicking a topic:

1. Calls `compassInterviewStartNow(topic)` to create the pending row.
2. Immediately calls `compassInterviewStart(interviewId)` to fire the agent's opening turn.
3. Navigates straight into the transcript view (`?tab=interviews&interviewId=…`).

Topic badges appear on the pending/active card header, the transcript view header, and each row in the past-interviews rail.

`agentCompassInterviewer` exposes both a streaming (`agentCompassInterviewerStream`) and non-streaming (`agentCompassInterviewerGenerate`)
entry rather than a `ToolLoopAgent`, because each "step" is the admin typing their reply, which arrives on a separate command call. The
message-send and start commands drive the streaming entry through `compassInterviewTurnRunDetached` (modelled on
`chatAssistantTurnRunDetached`) — the mutation returns as soon as the user-side row is durable; the agent turn runs detached and publishes
token-by-token deltas on `serverRuntime.publish.compassInterviewUpdates` under a client-allocated `generationId`. The transcript view
subscribes via `useCompassInterviewLiveUpdates` and renders in-flight buffers through the shared `MessageScroller` primitives — see
[`docs/styles/chat.md`](../styles/chat.md). Non-streaming path stays available for tests and any future scheduled-job caller that doesn't
have a live UI. Single sentinel tool `concludeInterview({ note })` that the turn-run helper branches on — its `note` is logged for audit,
not persisted on the row. System prompt is anchored to the soft 4–8 question target, asks for one question per turn, matches the admin's
reply language, and explicitly tells the agent NOT to summarize answers back (the analyzer does that).

Model: `serverRuntime.ai.compassInterviewerModel()` — Gemini 3.6 Flash (high thinking) by default. The interviewer runs on a low-frequency
cadence and the question-quality bar is high (probe gaps, don't repeat), so the higher tier is worth it.

### Cadence and idempotency

At most one open interview exists at a time. The cron handler reads `(status IN ('pending', 'in_progress'))` and exits if one is already
there, so two firings in the same minute, a worker replay, or a busy stretch with an un-started interview all converge on one row. The skip
command transitions `pending → skipped`, clearing the guard so the next cron tick inserts a fresh row.

Follow-up (if multi-user accounts appear): per-user compasses — the cron then creates one row per active user, gated by per-user
preferences.

## Follow-ups

- **~~Psychological-interview agent.~~ Done — see "Psychological-interview agent" above.**
- Per-user compasses if more than one admin account exists. Today's `COMPASS_SINGLETON_ID` becomes "the owner's id" and new users get fresh
  rows.
- Optional weekly cron synthesis as a backstop for idle weeks (currently only threshold + manual).
- "Undismiss" mutation if the admin changes their mind on an observation.
- Possibly a low-frequency analyzer pass over assistant messages once their reasoning is rich enough to be informative (today: avoided to
  prevent hall-of-mirrors bias).
- **~~"Start a new interview now" button for off-cycle, manually-triggered interviews.~~ Done — `AdminMutation.compassInterviewStartNow` +
  the button on `NoInterviewCard`; inserts a `pending` row with `triggerReason='manual'` under the same "at most one open interview" guard
  as the cron.**
