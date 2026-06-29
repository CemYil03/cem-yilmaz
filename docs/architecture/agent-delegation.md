# Agent Delegation

The personal assistant at `/workspace/assistant` is the single voice for every workspace domain — projects, tasks, future calendar / notes /
fitness / finances / medical / media. Landing every domain tool on the one `agentPersonalAssistant` factory does not scale: the system
prompt grows unmanageable, and tool-selection accuracy decays past ~10–15 tools. Instead, the orchestrator stays thin and hands each domain
off to a focused sub-agent.

This doc covers the pattern. The first sub-agent built on it is `agentPersonalAssistantProjects` — see
[features/projects-workspace.md](../features/projects-workspace.md) for how the user reaches it.

## Decision

**The orchestrator is a router with one `delegateTo<Domain>` tool per focus area.** Each delegate tool's `execute` builds the matching
domain sub-agent in-process, calls `agent.generate({ messages })` with the user's brief as a single user message, and returns a structured
summary plus a mutation log. The orchestrator narrates the result back to the user.

The domain sub-agent runs **synchronously inside the orchestrator's tool turn** — same process, same database connection, same Node event
loop. There is no queue, no separate session, no extra HTTP hop.

### Why in-process and not a sibling factory

The two existing chat agents (`agentVisitorAboutCem`, `agentPersonalAssistant`) sit at the same level: dispatched by access path, each with
its own `onStepFinish` plumbing, each persisting chat-message rows. Adding more siblings means every domain agent has to manage that
plumbing too, and every cross-domain turn requires multiple top-level dispatches stitched together by the client. In-process delegation
keeps the user-visible chat at a single turn even when several domains are touched, and the sub-agents stay small because they own no chat
persistence.

### What the sub-agent can and cannot do

- ✅ Read any data via its read tools and via inline snapshots in its system prompt.
- ✅ Mutate the DB via wrapped `commands/*.ts` — the same commands the GraphQL resolvers use, called directly. Authorization continues to
  flow through the resolver namespace at the call boundary (`AdminMutation` is `guardAdminMutation`-gated); inside that boundary every
  command runs with the same admin session.
- ✅ Run multiple tool calls in sequence — the `ToolLoopAgent` loop works exactly as for the orchestrator, just without `onStepFinish`.
- ❌ Persist chat-message rows. There is no `onStepFinish` plumbed in, so its intermediate tool calls and final text never reach
  `chatMessages*`. The orchestrator's single `chatMessagesToolCall` row for the `delegateToProjects` call is the only chat-visible artifact;
  its `toolResult` carries the structured mutation log.
- ❌ Ask the user for input mid-delegation. `promptUserForInput` would need to insert a `chatMessagesAssistantInputCollection` row, which
  requires chat persistence. Instead the sub-agent returns a `needsMoreInfo` JSON sentinel and the orchestrator owns the back-and-forth.

### Mutation log

Each mutation tool the sub-agent calls pushes onto a closure-shared `ProjectsAgentMutationLog` — a plain `MutationRecord[]` allocated fresh
inside the delegate tool's `execute`. After `agent.generate(...)` resolves, the delegate tool returns the log alongside the sub-agent's
final-text summary:

```ts
{ status: 'completed', summary: '...', mutations: [{ kind: 'projectCreate', id: '...', title: '...' }, ...] }
```

This gives the orchestrator concrete facts to narrate ("Created project X and added three tasks") without re-querying. The log is also the
only artifact in the chat transcript that reflects what the sub-agent actually changed — debug it from there.

### The `needsMoreInfo` and `noOp` sentinels

When the brief is underspecified or out of domain, the sub-agent emits **only** a JSON object as its final text:

```json
{ "status": "needsMoreInfo", "missingFields": ["title", "projectId"], "summary": "..." }
{ "status": "noOp",          "missingFields": [],                     "summary": "..." }
```

The delegate tool's `execute` parses these and returns them to the orchestrator. The orchestrator's system prompt instructs it to:

- on `needsMoreInfo`, call its own `promptUserForInput` with slots matching `missingFields`, then re-delegate with the brief enriched;
- on `noOp`, fall back to a plain conversational reply or another tool.

The parser accepts a bare object or a fenced ` ```json ` block defensively — Gemini occasionally wraps things even when told not to.

### Step budget

The sub-agent caps at `stepCountIs(8)`. The orchestrator caps at `stepCountIs(8)` as well, with `hasToolCall('promptUserForInput')` as the
hand-back-to-user signal. A single user message can therefore consume up to ~16 LLM steps if the orchestrator delegates once, gets
`needsMoreInfo`, asks the user, gets a reply, and re-delegates. Within one delegation the sub-agent has room for a list call + 2–3
mutations + final text without running into the ceiling.

## Alternatives Considered

| Approach                                                                                                                                                                                                | Why we didn't pick it                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **One agent, all the tools.** Keep growing `agentPersonalAssistant`'s tool map.                                                                                                                         | The reason for this whole doc: tool-selection accuracy drops past ~10–15 tools, system prompt bloats, every turn pays for the full catalog in tokens.                                                                                                                                                                                                                                                       |
| **Per-route sub-agent (no orchestrator).** Each `/workspace/<area>` page dispatches directly to its own agent via a separate mutation namespace, the way `multi-agent-chat.md` splits visitor vs admin. | Solves the page-local case cleanly but cannot handle a single user turn that crosses domains ("convert this request to a project and schedule a kickoff"). The orchestrator owns the chaining. We may still ship the per-route shortcut as a follow-up — `/workspace/projects`'s composer could call the projects sub-agent directly, skipping the orchestrator hop. Same factory, different dispatch path. |
| **Top-level sibling agent factories.** Each domain agent runs as another peer of `agentPersonalAssistant`, dispatched by the client picking a `kind`.                                                   | Requires the client to know which agent to address; reintroduces the spoofable dispatch the existing two-namespace split deliberately avoids. The access path stays authoritative — the client never picks an agent, the server does.                                                                                                                                                                       |
| **Persist sub-agent steps as chat rows.** Plumb `onStepFinish` into the sub-agent and write its tool calls and final text into `chatMessages*`.                                                         | Doubles the transcript-row count per delegation for negligible UX gain — the user already sees the mutation log on the delegate tool's result row. Debug via the structured summary, not by browsing two nested layers of tool-call rows.                                                                                                                                                                   |
| **Agent registry / generic dispatcher.** A table of `domainName → factory` so the orchestrator can pick by string.                                                                                      | Overkill for one sub-agent. Promote to a registry when the third domain lands and the manual wiring becomes repetitive.                                                                                                                                                                                                                                                                                     |
| **`needsApproval` on every mutation tool.** Gate every write with the SDK's approval lifecycle (the way Phase 2 was originally sketched).                                                               | Cem is the only caller on an admin-gated surface. Asking him to approve each write inside his own assistant is friction without a threat model behind it. Reintroduce when the surface broadens, or behind a per-tool config flag.                                                                                                                                                                          |

## Consequences

- **One file per sub-agent, one file per tool.** The convention is `src/server/agents/agentPersonalAssistant<Domain>.ts` for the sub-agent,
  one `src/server/agents/tool<Domain><Action>.ts` per tool. Top-level under `agents/` — no subfolder yet. Matches the visitor-agent shape.
- **Tools are thin wrappers around existing `commands/`+`queries/`.** CQRS already gave us single-purpose units. A tool file is mostly the
  Zod input schema, the closure-bound dependencies (`serverRuntime`, `session`, optional `mutations`), and 5–10 lines of `execute` that maps
  to the command's args shape and pushes onto the mutation log on success.
- **Shared scaffolding is one tiny module.** `src/server/agents/agentScaffolding.ts` exports `googleAgentProviderOptions` plus a
  `currentDateForAgent()` helper (today's date as a one-liner each system prompt embeds near the top so Gemini doesn't fall back to its
  training-cutoff date when reasoning about deadlines). Nothing else lives there per `multi-agent-chat.md`'s "tiny helper, not a base class"
  stance. System-prompt builders, stop conditions, and tool sets stay per-agent.
- **Sub-agent failure isolates to its turn.** An exception in any sub-agent tool propagates through `agent.generate`, surfaces as a
  rejection from the delegate tool's `execute`, and lands in the same `chatMessagesToolCall.toolResult` error path the runner already
  handles. The orchestrator can retry or apologize; the chat is never broken.
- **Cross-domain chaining is the orchestrator's job.** When calendar / notes / fitness sub-agents ship, the orchestrator calls them in
  series within a single turn. Each delegate tool's result feeds the next one's brief through plain prompt context — no shared state
  channel.

## Where things live

| Concern                                          | File                                                                                                       |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Shared provider options                          | `src/server/agents/agentScaffolding.ts`                                                                    |
| Sub-agent factory                                | `src/server/agents/agentPersonalAssistantProjects.ts`                                                      |
| Inline board snapshot for the sub-agent's prompt | `src/server/agents/projectsSnapshotForAgent.ts`                                                            |
| Read tools                                       | `src/server/agents/toolProjectsList.ts`, `toolStandaloneTasksList.ts`                                      |
| Mutation tools                                   | `src/server/agents/toolProjectUpsert.ts`, `toolProjectDelete.ts`, `toolTaskUpsert.ts`, `toolTaskDelete.ts` |
| Delegate tool (orchestrator-side)                | `src/server/agents/toolDelegateToProjects.ts`                                                              |
| Orchestrator                                     | `src/server/agents/agentPersonalAssistant.ts` (adds `delegateToProjects` to its tool map)                  |
