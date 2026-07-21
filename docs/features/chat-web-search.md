# Web search (admin chat)

The admin personal assistant on `/workspace/assistant` can search the web mid-conversation via Gemini's built-in **Google Search
grounding**. The visitor chat deliberately does **not** have this capability — see [Scope](#scope) below.

See also:

- [features/chat-workspace.md](./chat-workspace.md) — the chat surface this tool plugs into.
- [features/chat-visitor.md](./chat-visitor.md) — the parallel public chat, which is intentionally scoped narrower.
- [architecture/chat.md](../architecture/chat.md) — shared chat model; how visitor vs admin plug in via access path / `scope`.
- [features/chat-workspace.md](./chat-workspace.md) — Agent and GraphQL access for the personal assistant (where search is registered).
- [features/chat-email-tools.md](./chat-email-tools.md) — example of a tool the visitor agent owns but the admin agent does not (the
  asymmetry runs both directions).

## User behaviour

When the admin asks the workspace assistant something time-sensitive or external — current prices, recent releases, library docs, sports
results, "what's the latest on X" — the agent reaches for `delegateToWebSearch` (a sub-agent delegate) instead of answering from its
training cutoff. The synthesized answer comes back inline; the sources are inlined as `[title](url)` markdown links beside the relevant
sentences so the existing `<AssistantMarkdown>` renderer turns them into clickable anchors. The admin can click through to verify any claim.

The agent is prompted to **skip** search for things it can already answer:

- Facts about Cem already in the compass-summary block of its prompt.
- Workspace data (projects, tasks) — that goes through `delegateToProjects`, which has the live snapshot.
- Pure reasoning / arithmetic / code questions.

Each sub-agent runs up to one refinement internally before giving up, so a single delegation never spirals into an open-ended search
session.

### Batched briefs

`delegateToWebSearch` takes an array — `briefs: string[]` (min 1, max 5) — rather than a single query. Each brief spins up its own
`agentPersonalAssistantWebSearch` instance; the delegate tool fans out with `Promise.allSettled` so all sub-agents hit Google Search
grounding in parallel. This is the one delegate in the workspace that fans out: web search is stateless and provider-executed, so there's no
mutation log to serialize (see [architecture/agent-delegation.md](../architecture/agent-delegation.md) for why projects and media stay 1:1).

The orchestrator is prompted to batch naturally-parallel questions ("compare React, Vue, Svelte", "latest on X and Y") into a single call
rather than chaining delegations across turns. A single-item array covers the lone-question case.

The result envelope is `{ status: 'completed' | 'partial' | 'failed', results: Array<{ brief, status, summary }> }`. `status` on the batch
is `completed` if every brief succeeded, `failed` if every brief threw, `partial` otherwise. Each `results` entry carries its own
`status`/`summary` — the orchestrator narrates each brief individually and names any that failed. Per-brief errors are caught inside the
fan-out and logged via `serverRuntime.log.error` so a partial failure never goes silent.

In the transcript the delegate row stays flat: one `delegateToWebSearch` pill with N `Called googleSearch` child rows FK'd to it. This
matches the single-brief shape today and needs no renderer changes.

## Scope

**Admin only.** The visitor agent (`agentVisitor`) is deliberately scoped to answering about Cem and to the three transactional email-shaped
tools. Adding web search there would turn the visitor chat from "Ask me anything about Cem" into a general-purpose chatbot, which dilutes
the product, expands the moderation surface, and invites quota burn from anonymous traffic. If a real visitor use case emerges later (e.g.
"find recent press about Cem"), we can revisit with a narrower, allowlisted variant.

## Why Google's grounding tool

The admin agent already runs on Gemini via `@ai-sdk/google`. Google Search grounding is the provider's first-party tool:

- **Zero new infrastructure.** No new API key, no new vendor, no separate billing surface. It rides on the existing
  `GOOGLE_GENERATIVE_AI_API_KEY` and reuses the bound `google` provider in `serverRuntimeCreate.ts`.
- **Provider-executed.** Gemini runs the search server-side; we do not own an `execute` function. The call lands in the normal
  `step.toolCalls` / `step.toolResults` channel just like any function tool, so the existing `chatAssistantTurnRun` persistence path picks
  up the row without modification.
- **Citations attached.** Grounded responses come back with `groundingMetadata` (URIs + titles) on `providerMetadata.google`. The agent is
  prompted to inline those as markdown links in its reply text, so the chat renderer handles them with no UI work.

Alternatives considered:

- **Third-party search APIs (e.g. Brave Search, Exa).** More control over result shape and a non-Google index — but each adds an env var, a
  bill, a dependency, and we would have to own the `execute` (fetch results, strip page content, manage retries). Only worth it if we
  specifically need a non-Google index or outgrow grounding.
- **Self-hosted (SearXNG).** Not worth the operational overhead for a single admin user.

## Implementation

The admin agent doesn't register `googleSearch` directly. It's wrapped in a delegate sub-agent — same shape as `delegateToProjects` — so the
orchestrator's tool map contains only function tools. The sub-agent's tool map contains only the provider tool. See
[Why wrapped in a sub-agent](#why-wrapped-in-a-sub-agent) for the reason.

| File                                                   | What it does                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/server/domain/ServerRuntime.ts`                   | Adds `webSearchTool: () => Tool` to the `ai` factory surface so the provider binding has a single home.                                                                                                                                                                                                                                                                                      |
| `src/server/domain/serverRuntimeCreate.ts`             | Binds `webSearchTool` to `google.tools.googleSearch({})`. Keeps `@ai-sdk/google` out of the agent files.                                                                                                                                                                                                                                                                                     |
| `src/server/agents/toolWebSearch.ts`                   | Thin wrapper returning `serverRuntime.ai.webSearchTool()`. Used only by the web-search sub-agent.                                                                                                                                                                                                                                                                                            |
| `src/server/agents/agentPersonalAssistantWebSearch.ts` | Sub-agent factory. `ToolLoopAgent` with `googleSearch` as its **only** tool, `isStepCount(4)` ceiling, Flash-fallback model. System prompt teaches it to run at most one refinement, inline `[title](url)` citations, and stay in the search lane.                                                                                                                                           |
| `src/server/agents/toolDelegateToWebSearch.ts`         | Orchestrator-side delegate tool. Takes `briefs: string[]` (1–5) and fans out one sub-agent per brief with `Promise.allSettled`. Pre-writes its own `chatMessagesToolCall` row so every sub-agent's child rows FK to it; per-brief try/catch surfaces failure as an entry-level `{ status: 'failed', summary }` and the batch as `{ status: 'completed' \| 'partial' \| 'failed', results }`. |
| `src/server/agents/agentPersonalAssistant.ts`          | Registers `delegateToWebSearch: toolDelegateToWebSearch(...)` in `tools:` and teaches the system prompt when to use / when to skip it.                                                                                                                                                                                                                                                       |
| `src/server/test/commandTestUtils.ts`                  | Stubs `webSearchTool` on the mock `ServerRuntime` so command tests keep building without hitting Gemini.                                                                                                                                                                                                                                                                                     |

The visitor agent (`agentVisitor`) is not touched.

## Why wrapped in a sub-agent

Gemini 2.5 (and earlier) rejects requests that mix **provider-defined tools** — Google Search grounding is one — with **function tools**
(`promptUserForInput`, `delegateToProjects`) in the same call. The AI SDK surfaces the upstream limitation as the warning:

> AI SDK Warning (google.generative-ai / gemini-2.5-flash): The feature "combination of function and provider-defined tools" is not
> supported.

The first cut of this feature registered `googleSearch` directly on the orchestrator's tool map alongside the function tools, and the
limitation went unnoticed because Gemini either silently dropped one side or had not yet started warning. The model upgrade chain made it
explicit, and any turn that registered both kinds at once was effectively broken.

Gemini 3 lifts the restriction ([source](https://ai.google.dev/gemini-api/docs/google-search)), but the admin can pick 2.5 from the
composer, so the wrap is the lower-common-denominator fix: the orchestrator only ever sees function tools; the search sub-agent only ever
sees the provider tool; both kinds of model work without branching.

Alternatives considered for the cross-version split, none picked:

- **Detect the model and conditionally register `googleSearch` only on Gemini 3.** Halves the surface area on Pro turns but adds a per-model
  branch in the orchestrator tool map. The sub-agent wrap is the same cost in code and works uniformly.
- **Force the catalog to Gemini 3 only.** Possible once 3-Flash matures, but 2.5-Flash is still the fallback (cheapest, fastest) and the
  composer surfaces both Pro and Flash on both versions. Locking the catalog would either remove options the admin wants or remove the cheap
  fallback we rely on inside the sub-agents themselves.
- **Drop function tools while a search is in flight.** Splits one user turn into multiple orchestrator turns with no clean way to thread
  state back through the SDK. The delegate pattern already covers in-flight sub-agent work without that contortion.

## Model compatibility

Every Gemini model in the current admin catalog (`adminChatModels.ts`) works under this design: the orchestrator only registers function
tools (which every Gemini accepts), and the web-search sub-agent only registers the provider tool (also accepted on every Gemini that
supports grounding). The "function + provider-defined" combination — the one Gemini 2.5 rejects — is the case we structurally avoid.

## Citation rendering

The agent inlines `[title](url)` markdown links directly in its reply text. The existing `<AssistantMarkdown>` (Streamdown) component
already renders links as anchors, so there is no new UI. The raw `groundingMetadata` arrives on `providerMetadata.google` for the relevant
step and is currently not surfaced — if we later want a structured "Sources" block under the message (one of the
[alternatives considered](#why-googles-grounding-tool)), that data is the entry point.

## Anti-patterns avoided

- **No `execute` for `googleSearch`.** Gemini runs the search itself; writing an `execute` would either silently shadow the provider call or
  fail at validation. The wrapper returns the provider tool as-is — the wrap that matters here is the **sub-agent** around it, not an
  `execute` around the provider tool.
- **Not registered alongside function tools on the orchestrator.** That's the whole point of the sub-agent wrap — see
  [Why wrapped in a sub-agent](#why-wrapped-in-a-sub-agent). The orchestrator's tool map contains only function tools.
- **Not on the visitor agent.** See [Scope](#scope).
- **Not in `agentPersonalAssistantProjects`.** Search is its own sub-agent — `agentPersonalAssistantWebSearch` — under the orchestrator,
  parallel to the projects sub-agent rather than tucked inside it. If a projects mutation ever needs an external lookup, the orchestrator
  chains the two delegates within a single turn rather than threading search into the projects sub-agent.
