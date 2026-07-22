# Agent Delegation

## Context

The personal assistant at `/workspace/assistant` is the single voice for every workspace domain. Landing every domain tool on the one
`agentPersonalAssistant` factory does not scale: the system prompt grows unmanageable, and tool-selection accuracy decays past ~10–15 tools.
Instead, the orchestrator stays thin and hands each domain off to a focused sub-agent.

This doc covers the pattern. Many domain sub-agents ship today — projects, media, medical, travel, nutrition, fitness, finances, inventory,
tax, and web search — each wired identically via a `delegateTo*` tool. Per-domain behavior lives in the matching `docs/features/` doc (e.g.
[workspace-projects.md](../features/workspace-projects.md), [workspace-media.md](../features/workspace-media.md)); the file map is in
[Where things live](#where-things-live) below.

## Decision

**The orchestrator is a router with one `delegateTo<Domain>` tool per focus area.** Each delegate tool's `execute` builds the matching
domain sub-agent in-process, calls `agent.generate({ messages })` with the user's brief as a single user message, and returns a structured
summary. The orchestrator narrates the result back to the user.

The domain sub-agent runs **synchronously inside the orchestrator's tool turn** — same process, same database connection, same Node event
loop. There is no queue, no separate session, no extra HTTP hop.

### Why in-process and not a sibling factory

The two existing chat agents (`agentVisitor`, `agentPersonalAssistant`) sit at the same level: dispatched by access path, each with its own
`onStepEnd` plumbing, each persisting chat-message rows. Adding more siblings means every domain agent has to manage that plumbing too, and
every cross-domain turn requires multiple top-level dispatches stitched together by the client. In-process delegation keeps the user-visible
chat at a single turn even when several domains are touched, and the sub-agents stay small because they own no chat persistence.

### What the sub-agent can and cannot do

- ✅ Read any data via its read tools and via inline snapshots in its system prompt.
- ✅ Mutate the DB via wrapped `commands/*.ts` — the same commands the GraphQL resolvers use, called directly. The AI-SDK `tool()` wrapper
  that exposes a command to sub-agents lives **in the command file itself** (colocated below the command function), not in a separate
  `agents/toolX.ts`. Authorization continues to flow through the resolver namespace at the call boundary (`AdminMutation` is
  `guardAdminMutation`-gated); inside that boundary every command runs with the same admin session.
- ✅ Run multiple tool calls in sequence — the `ToolLoopAgent` loop works the same way as on the orchestrator.
- ✅ Persist tool-call rows. The sub-agent now receives an `onStepEnd` from the delegate tool; every tool call lands in
  `chatMessagesToolCall` with `parentChatMessageId` pointing at the delegate row's id, and the transcript renders them indented under the
  parent card. See [Nested tool calls](#nested-tool-calls) below.
- ❌ Persist `assistantText` rows. The sub-agent's final text is the orchestrator's `toolResult` payload, not a chat-visible row —
  user-facing narration is the orchestrator's job.
- ❌ Ask the user for input mid-delegation. `promptUserForInput` would need to insert a `chatMessagesAssistantInputCollection` row, which
  requires `generationId` plumbing back into the orchestrator's turn-runner. Instead the sub-agent returns a `needsMoreInfo` JSON sentinel
  and the orchestrator owns the back-and-forth.

### Parallel fan-out (web search only)

`delegateToWebSearch` takes `briefs: string[]` and fans out one sub-agent per brief with `Promise.allSettled`. All sub-agent tool-call rows
FK to the single pre-written delegate row (flat under one parent — no new nesting depth in the transcript renderer), and the delegate's
`toolResult` carries a per-brief `{ brief, status, summary }` array plus an aggregated batch `status` of `completed` / `partial` / `failed`.

Web search is the only delegate that fans out. The sub-agent is stateless and provider-executed (Gemini owns the search round-trip), so N
concurrent instances are safe. `delegateToProjects` and `delegateToMedia` stay 1:1: they issue DB writes, and running parallel copies of one
domain sub-agent would race on the same tables. If a future read-only domain sub-agent shows up (pure lookups, no writes), the fan-out shape
can be reused; anything that writes stays 1:1.

### Surfacing ids for deep-linking

The sub-agent has no machine-readable mutation log. Instead, its system prompt tells it to **name the ids of any rows it created or
changed** in its final-text `summary` (it sees each command's `referenceIds` in the tool result during its turn). The delegate returns that
summary to the orchestrator:

```ts
{ status: 'completed', summary: 'Created project "Acme rebuild" (4f2a…) and added three tasks.' }
```

The orchestrator's system prompt turns those ids into deep-links (`[Acme rebuild](/workspace/projects?…&focus=4f2a…)`). The authoritative
record of what the sub-agent actually changed is the set of persisted `chatMessagesToolCall` child rows (see
[Nested tool calls](#nested-tool-calls)) — one row per DB write, visible in the transcript.

### The `needsMoreInfo`, `noOp`, and `failed` sentinels

When the brief is underspecified or out of domain, the sub-agent emits **only** a JSON object as its final text:

```json
{ "status": "needsMoreInfo", "missingFields": ["title", "projectId"], "summary": "..." }
{ "status": "noOp",          "missingFields": [],                     "summary": "..." }
```

The delegate tool's `execute` parses these and returns them to the orchestrator. The orchestrator's system prompt instructs it to:

- on `needsMoreInfo`, call its own `promptUserForInput` with slots matching `missingFields`, then re-delegate with the brief enriched;
- on `noOp`, fall back to a plain conversational reply or another tool.

The parser accepts a bare object or a fenced ` ```json ` block defensively — Gemini occasionally wraps things even when told not to.

There is a third terminal status, **`failed`**, that the sub-agent never emits itself — the delegate tool's `execute` synthesizes it. The
sub-agent run (the `agent.generate` call inside `toolDelegateToProjects.execute`) is wrapped in a `try/catch`; any throw — provider error,
schema-decode error, command exception — is caught there, logged via `serverRuntime.log.error`, and turned into
`{ status: 'failed', summary: '<one-line error message>' }`. The orchestrator's system prompt instructs it to narrate the failure verbatim
and **not** to confabulate softer phrasings ("the tool is unreachable") or silently retry. Any writes that DID land before the throw are
still visible as persisted `chatMessagesToolCall` child rows. Without this catch the AI SDK wraps the exception as an inert `tool-error`
content part on the next step — the orchestrator sees only the error envelope, no log entry exists at the delegate layer, and the model
invents an apology. The catch closes that gap; the same gap is also covered defensively by `chatPersistStep`'s Phase A pass over
`tool-error` parts (see [Server-side error surfacing](#server-side-error-surfacing) below).

### Step budget

The sub-agent caps at `isStepCount(10)`. The orchestrator caps at `isStepCount(8)`, with `hasToolCall('promptUserForInput')` as the
hand-back-to-user signal. A single user message can therefore consume up to ~16 LLM steps if the orchestrator delegates once, gets
`needsMoreInfo`, asks the user, gets a reply, and re-delegates. Within one delegation the sub-agent has room for a list call + 2–3
mutations + final text without running into the ceiling.

### Nested tool calls

The orchestrator's `delegateToProjects` row lands in the transcript as a normal `chatMessagesToolCall`, but the calls the sub-agent makes
inside that delegation are **also persisted** — each child row carries `parentChatMessageId = <delegate row id>` on the spine, and the
transcript renderer (`partitionByParent` in `src/web/chat/chatTranscript.ts`) filters child rows out of the top-level list and hands them to
the parent's `<ChatMessageToolCall>` view, which renders them in an indented block below its own pill.

What this means concretely:

- The user sees `Called delegateToProjects` followed by `Called adminProjectFindMany`, `Called adminProjectsUpsert`,
  `Called adminProjectTasksUpsert`, `Called adminProjectActivitiesUpsert`, `Called adminProjectLinksUpsert`, `Called projectFileCreate` …
  indented under the parent — an honest record of which DB writes happened, not a single opaque pill.
- The `delegateToProjects` row's `toolResult` still carries the structured `{ status, summary }` payload the orchestrator uses for its
  narration. That payload is what the LLM sees on replay; the indented child rows are user-facing additional context.
- `toModelMessages` does NOT look at `parentChatMessageId`. Each child is replayed as an ordinary `tool-call`/`tool-result` pair, so the
  AI-SDK contract stays intact and the LLM gets one extra source of context (it can read what the sub-agent actually did).

The persistence flow is asymmetric because of FK ordering. The orchestrator's `onStepEnd` only fires after a tool's `execute` returns, so
the parent row would be written **after** the children — making the children's FK invalid at insert time. To work around this, the delegate
tool pre-writes its own `chatMessagesToolCall` row up front (`toolResult: null`) inside `execute`, adds its `toolCallId` to a shared
`preWrittenToolCallIds` set so the orchestrator's outer `onStepEnd` skips it, runs the sub-agent (whose own `onStepEnd` is bound to
`chatPersistStep` with `parentChatMessageId` set), then updates the delegate row with the final `toolResult` + `resultedAt` and republishes
a fresh `ChatUpdateMessageAppended` so the UI swaps in the complete card.

The shared persistence helper is `chatPersistStep` in `src/server/commands/chatAssistantTurnRun.ts`. Both the orchestrator's `onStepEnd` and
the sub-agent's `onStepEnd` call it with different `parentChatMessageId` (null vs. the delegate row's id). Adding a second delegating tool
means another `tool<Domain>Delegate.ts` file that mirrors `toolDelegateToProjects` — same pre-write pattern, same shared
`preWrittenToolCallIds` set on `AgentChatOptions`. No new persistence code.

### Deep links

The orchestrator's system prompt (`BASE_SYSTEM_PROMPT` in `src/server/agents/agentPersonalAssistant.ts`) carries a route-map block that
instructs the model to format every project / inbox row / task / visitor chat it mentions as a markdown link to the matching workspace page
with a `?focus=<id>` search param. `<AssistantMarkdown>` (the streamdown wrapper) renders these as clickable anchors. The destination pages
read `focus` from their `validateSearch` schema and scroll-into-view + flash the matching DOM element (any `<li data-row-id="...">`) for
~1500ms before dropping the param via a replace-navigate so a refresh doesn't re-flash. The flash animation is `@keyframes focus-flash` in
`src/styles.css`, respecting `prefers-reduced-motion`.

The orchestrator gets the ids it needs from the sub-agent's `summary`, which names the id of every row it created or changed; the
orchestrator's prompt turns those into deep-links. Routes that wire this today: `/workspace/projects`
(`?tab=…&focus=<projectId | projectRequestId | taskId>`) and the visitor-chats review page (`?chatId=<chatId>`). Future routes hook in by
adding `focus` to their search schema and the same `useEffect` shape.

## Alternatives Considered

| Approach                                                                                                                                                                                                                                                                                                                    | Why we didn't pick it                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **One agent, all the tools.** Keep growing `agentPersonalAssistant`'s tool map.                                                                                                                                                                                                                                             | The reason for this whole doc: tool-selection accuracy drops past ~10–15 tools, system prompt bloats, every turn pays for the full catalog in tokens.                                                                                                                                                                                                                                                       |
| **Per-route sub-agent (no orchestrator).** Each `/workspace/<area>` page dispatches directly to its own agent via a separate mutation namespace, the way visitor vs admin chats already split by GraphQL access path ([chat-visitor.md](../features/chat-visitor.md) / [chat-workspace.md](../features/chat-workspace.md)). | Solves the page-local case cleanly but cannot handle a single user turn that crosses domains ("convert this request to a project and schedule a kickoff"). The orchestrator owns the chaining. We may still ship the per-route shortcut as a follow-up — `/workspace/projects`'s composer could call the projects sub-agent directly, skipping the orchestrator hop. Same factory, different dispatch path. |
| **Top-level sibling agent factories.** Each domain agent runs as another peer of `agentPersonalAssistant`, dispatched by the client picking a `kind`.                                                                                                                                                                       | Requires the client to know which agent to address; reintroduces the spoofable dispatch the existing two-namespace split deliberately avoids. The access path stays authoritative — the client never picks an agent, the server does.                                                                                                                                                                       |
| **Persist sub-agent steps as chat rows.** Plumb `onStepEnd` into the sub-agent and write its tool calls into `chatMessages*`.                                                                                                                                                                                               | **Now the chosen path** — see [Nested tool calls](#nested-tool-calls). Hiding what the sub-agent actually did behind one opaque pill made the transcript misleading; the indented child rows are now a faithful record. The trade-off (more rows per delegation, slightly more replay context for the LLM) is acceptable; sub-agent free-text still doesn't persist.                                        |
| **Agent registry / generic dispatcher.** A table of `domainName → factory` so the orchestrator can pick by string.                                                                                                                                                                                                          | Overkill for one sub-agent. Promote to a registry when the third domain lands and the manual wiring becomes repetitive.                                                                                                                                                                                                                                                                                     |
| **`needsApproval` on every mutation tool.** Gate every write with the SDK's approval lifecycle (the way Phase 2 was originally sketched).                                                                                                                                                                                   | Only admin callers reach this surface. Asking them to approve each write inside their own assistant is friction without a threat model behind it. Reintroduce when the surface broadens, or behind a per-tool config flag.                                                                                                                                                                                  |

## Consequences

- **One file per sub-agent; write tools are colocated with their command.** The convention is
  `src/server/agents/agentPersonalAssistant<Domain>.ts` for the sub-agent. A tool that wraps a `commands/` write lives **in that command
  file** (the factory is appended below the command function and exported as `tool<Domain><Action>`). Read-only tools that wrap `queries/`
  or external APIs still live as their own `src/server/agents/tool<X>.ts`. Top-level under `agents/` — no subfolder yet.
- **Tools are thin wrappers around existing `commands/`+`queries/`.** CQRS already gave us single-purpose units. A tool factory is mostly
  the Zod input schema, the closure-bound dependencies (`serverRuntime`, `session`), and 5–10 lines of `execute` that maps to the command's
  args shape and returns its result.
- <a id="tool-input-schemas"></a>**The default input schema is the generated `GqlS<X>InputSchema()` from
  `src/server/graphql/generated.ts`.** Same shape the resolver validates, no hand-built duplicate to drift out of sync as the SDL evolves.
  `typescript-validation-schema` (see [`codegen.ts`](../../codegen.ts) and [api-layer.md](./api-layer.md#code-generation)) emits both the
  object-schema factories (`GqlS<Input>Schema()`) and the enum schemas (`GqlS<Enum>Schema`) exactly for this consumer. Every mutation tool
  whose underlying command has a GraphQL input type — `toolProjectLinksUpsert`, `toolMediaChannelsUpsert`, `toolShowsUpsert`,
  `toolMedicalRecordFileAttach`, the five tax batch-upsert tools (all four tax input types carry only `Date` fields, never `DateTime`, so
  they reuse the generated schema verbatim), and the four travel batch-upsert tools (which wrap the generated row schema in a single-key
  `z.object({ <entities>: z.array(...) })`) — imports its generated schema and uses it verbatim (with a `rawInput as GqlS<X>` cast to
  recover TS inference from the codegen's `Properties<T>` phantom; the runtime schema still validates against the type). Field-level
  explanations travel via the SDL's own field descriptions — `withDescriptions: true` on the codegen plumbs them into the generated Zod
  schemas — so the SDL stays the single source of truth for both the wire format and the field-level teaching the LLM sees.
- **Prefer batch shapes (`entitiesAction`) over singulars.** One `adminTravelTripDaysUpsert` (accepting `[AdminTravelTripDayInput!]!`) beats
  N `adminTravelTripDayUpsert` calls: fewer agent steps against `isStepCount(10)`, one transaction on the server, one `userUpdates` publish
  per batch. Every entity write on the travel domain uses this shape (`adminTravelTripsUpsert`, `adminTravelTripDaysUpsert`,
  `adminTravelTripActivitiesUpsert`, `adminTravelTripPackingItemsUpsert`, plus the matching deletes taking `[ID!]!`). Corresponding
  mutations return `MutationResult { success, referenceIds }` — never the hydrated entity — because the seed-and-subscribe posture over
  `userUpdates` already delivers the new state; a second row-shape in the mutation result would just be a second source of truth to keep
  aligned. `referenceIds` echoes the id per input row (in input order) so the sub-agent can use them as parent ids for the next tool call
  without a follow-up read.
- **Exception: `DateTime` fields.** When the underlying SDL input carries a `DateTime` scalar, the tool falls back to a hand-built
  `z.object` that uses `z.string()` for those fields and calls `new Date(...)` in `execute`. `typescript-validation-schema` emits `DateTime`
  as `z.date()`, which has no clean JSON-Schema representation under Gemini's constrained decoding (`structuredOutputs: true`) and produces
  `MALFORMED_FUNCTION_CALL` on plain inputs. Tools currently in this state: `toolProjectsUpsert`, `toolTasksUpsert`,
  `toolProjectActivitiesUpsert`, `toolMoviesUpsert`, `toolMedicalAppointmentsUpsert`, `toolMedicalRecordsUpsert`, `toolInventoryItemsUpsert`
  (`disposedAt`), `toolInventoryItemsReprice` (`valuedAt`). Each keeps a short header comment pointing back to this bullet. **Enum schemas**
  (`GqlS<X>EnumSchema`) are still reused in the hand-built shape so a future enum addition surfaces as a TS error rather than a runtime
  mismatch; do not redeclare enum tuples by hand. Field-name drift between the SDL input and the tool input is caught by the resolver call:
  every mutation tool's `execute` constructs the resolver `input` object explicitly (or passes the validated input verbatim when the command
  signature accepts the domain input directly), so a missing or renamed field is a TS error at the tool file.
- **Follow-up (not yet done):** DateTime-safety is the open thread — either the codegen emits `z.iso.datetime()` for `DateTime` behind a
  separate agent-facing output, or a runtime helper walks `z.date()` → string on the object schemas. Either would let the DateTime-carrying
  tools drop their hand-built duplicates too.
- <a id="tool-self-description"></a>**Tool self-description is authoritative.** A tool's `description` string plus its per-field
  `.describe(...)` calls are the ONLY place a tool is explained. System prompts NEVER list tools — no "You have N tools: - foo does X"
  catalog, no orchestrator-side "Capabilities" bullets that restate what each delegate is for, no "When to search" block that duplicates
  what `toolDelegateToWebSearch` already carries. The information belongs on one surface so a change to one doesn't silently diverge from
  the other; the LLM sees the tool description on every call anyway, so the duplication buys nothing but drift risk.

  What DOES stay in a system prompt: persona ("you are the medical sub-agent"), style rules (concision, language matching), cross-tool
  workflow rules that span multiple tools (`agentPersonalAssistantMedia`'s "for 'I watched X' → `adminMediaMoviesUpsert` with
  `status: watched`; if not in library → `adminMediaMoviesAddFromTmdb` first" workflow), agent-role behavior rules (the medical sub-agent's
  RED FLAGS block — that's a _don't-call-any-tool_ rule), the `{ status: 'needsMoreInfo' | 'noOp' }` JSON sentinel contract (this is the
  sub-agent → orchestrator wire, not a tool behavior), delegate-result-envelope narration policy on the orchestrator (how to react to
  `needsMoreInfo` / `failed`), deep-link templates (narration policy for the ids delegates return), and inlined data snapshots.

  The canonical exemplar of a self-describing tool is `toolProjectActivitiesUpsert.ts`: a multi-sentence description that names when to
  reach for it, the cross-tool guidance ("work timer rows are NOT created here"), and per-field `.describe(...)` for every input. The
  anti-pattern is a `buildSystemPrompt` with a "You have nine tools: - `adminProjectFindMany` — ... - `adminProjectsUpsert` — ..." block.

- **Sub-agent failure is caught at the delegate layer and surfaced as `status: 'failed'`.** `toolDelegateToProjects.execute` wraps
  `agent.generate` in a try/catch: any throw — provider call, schema-decode mismatch, mutation command exception — is logged via
  `serverRuntime.log.error` and returned as `{ status: 'failed', summary }`. The orchestrator's system prompt tells it to narrate the
  failure verbatim instead of inventing a softer phrasing. Without this catch the AI SDK quietly wraps the exception as an inert
  `tool-error` content part and no log entry exists at the delegate layer — every project-create failure used to look like "the tool is
  unreachable" with no server-side trace.

### Server-side error surfacing

`tool-error` content parts (the AI SDK's way of representing a tool whose `execute` threw) are surfaced in two places, both belt-and-braces:

- **Inside the delegate tool** — the try/catch around `agent.generate` logs the original throwable directly with full context. This is the
  primary path; the catch knows the throw came from this delegation and can attach the structured `failed` result to the pre-written
  delegate row before returning it.
- **Inside `chatPersistStep` (Phase A)** — any `tool-error` content part the orchestrator's `onStepEnd` sees still gets logged via
  `serverRuntime.log.error`. This catches the cases the delegate-layer catch cannot: a non-delegating tool that throws, a future tool with
  its own `execute`, or a `tool-error` synthesized by the SDK for reasons other than an `execute` throw. We do not write a dedicated chat
  row for the error — the matching tool-call row from Phase B already carries the error payload as its `toolResult` for the LLM. The Phase A
  pass exists solely to refuse to let a silent failure go without a log entry.
- **Shared scaffolding is one tiny module.** `src/server/agents/agentScaffolding.ts` exports `googleAgentProviderOptions` plus a
  `currentDateForAgent()` helper (today's date as a one-liner each system prompt embeds near the top so Gemini doesn't fall back to its
  training-cutoff date when reasoning about deadlines). Nothing else lives there — a tiny helper, not a base class; system-prompt builders,
  stop conditions, and tool sets stay per-agent (same stance as the visitor / personal-assistant factories).
- **Sub-agent failure isolates to its turn.** See the **`status: 'failed'`** bullet above and
  [Server-side error surfacing](#server-side-error-surfacing). The orchestrator narrates the failure to the user; the chat is never broken.
- **Cross-domain chaining is the orchestrator's job.** The orchestrator calls delegates in series within a single turn (nutrition, fitness,
  travel, medical, media, projects, finances, inventory, tax, and web search all ship today; calendar / notes are future). Each delegate
  tool's result feeds the next one's brief through plain prompt context — no shared state channel.

## Where things live

| Concern                                             | File                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared provider options                             | `src/server/agents/agentScaffolding.ts`                                                                                                                                                                                                                                                                                                                                               |
| Projects sub-agent factory                          | `src/server/agents/agentPersonalAssistantProjects.ts`                                                                                                                                                                                                                                                                                                                                 |
| Inline board snapshot for the projects sub-agent    | `src/server/agents/projectsSnapshotForAgent.ts`                                                                                                                                                                                                                                                                                                                                       |
| Projects read tools                                 | `src/server/agents/toolProjectsList.ts`, `toolProjectGet.ts`, `toolProjectFileContentGet.ts`, `toolStandaloneTasksList.ts`                                                                                                                                                                                                                                                            |
| Projects write tools (colocated with command)       | `src/server/commands/adminProjectsUpsert.ts`, `adminProjectsDelete.ts`, `adminProjectTasksUpsert.ts`, `adminProjectTasksDelete.ts`, `adminProjectActivitiesUpsert.ts`, `adminProjectLinksUpsert.ts`, `projectFileCreateFromMarkdown.ts`                                                                                                                                               |
| Projects delegate tool (orchestrator-side)          | `src/server/agents/toolDelegateToProjects.ts`                                                                                                                                                                                                                                                                                                                                         |
| Web-search sub-agent factory                        | `src/server/agents/agentPersonalAssistantWebSearch.ts`                                                                                                                                                                                                                                                                                                                                |
| Web-search provider tool wrapper (sub-agent-only)   | `src/server/agents/toolWebSearch.ts`                                                                                                                                                                                                                                                                                                                                                  |
| Web-search delegate tool (orchestrator-side)        | `src/server/agents/toolDelegateToWebSearch.ts`                                                                                                                                                                                                                                                                                                                                        |
| Nutrition sub-agent (factory / snapshot / delegate) | `src/server/agents/agentPersonalAssistantNutrition.ts`, `nutritionSnapshotForAgent.ts`, `toolDelegateToNutrition.ts` (+ `toolRecipes*`, `toolMealPlanEntries*`, `toolFoodLogEntries*`, `toolRecipesList`, `toolMealPlanList`, `toolFoodLogList`, `toolSupplementsList`, `toolSupplementResearch`, `toolSupplementsUpsert`, `toolSupplementNutrientsReplace`, `toolSupplementsDelete`) |
| Fitness sub-agent (factory / snapshot / delegate)   | `src/server/agents/agentPersonalAssistantFitness.ts`, `fitnessSnapshotForAgent.ts`, `toolDelegateToFitness.ts` (+ `toolExercises*`, `toolWorkoutRoutines*`, `toolWorkoutRoutineItems*`, `toolWorkoutSessions*`, `toolWorkoutSets*`, `toolExercisesList`, `toolRoutinesList`, `toolWorkoutSessionsList`)                                                                               |
| Finances sub-agent (factory / snapshot / delegate)  | `src/server/agents/agentPersonalAssistantFinances.ts`, `financesSnapshotForAgent.ts`, `toolDelegateToFinances.ts` (+ `toolFinanceRecurringCostsUpsert`, `toolFinanceRecurringCostsDelete`, `toolFinanceRecurringCostsList`, `toolFinanceIncomeStreamsUpsert`, `toolFinanceIncomeStreamsDelete`, `toolFinanceIncomeStreamsList`)                                                       |
| Inventory sub-agent (factory / snapshot / delegate) | `src/server/agents/agentPersonalAssistantInventory.ts`, `inventorySnapshotForAgent.ts`, `toolDelegateToInventory.ts` (+ `toolInventoryItemsUpsert`, `toolInventoryItemsDelete`, `toolInventoryItemsReprice`, `toolInventoryServiceEntriesUpsert`, `toolInventoryServiceEntriesDelete`, `toolInventoryFilesUpsert`, `toolInventoryFilesDelete`, `toolInventoryItemsList`)              |
| Tax sub-agent (factory / snapshot / delegate)       | `src/server/agents/agentPersonalAssistantTax.ts`, `taxSnapshotForAgent.ts`, `toolDelegateToTax.ts` (+ `toolTaxYearsUpsert`, `toolTaxIncomeSourcesUpsert`, `toolTaxExpensesUpsert`, `toolTaxDocumentsUpsert`, `toolTaxYearsList`)                                                                                                                                                      |
| Orchestrator                                        | `src/server/agents/agentPersonalAssistant.ts` (registers `delegateToProjects`, `delegateToMedia`, `delegateToMedical`, `delegateToTravel`, `delegateToNutrition`, `delegateToFitness`, `delegateToFinances`, `delegateToInventory`, `delegateToTax`, `delegateToWebSearch`)                                                                                                           |
