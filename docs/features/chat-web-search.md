# Web search (admin chat)

The admin personal assistant on `/workspace/assistant` can search the web mid-conversation via Gemini's built-in **Google Search
grounding**. The visitor chat deliberately does **not** have this capability — see [Scope](#scope) below.

See also:

- [features/chat-workspace.md](./chat-workspace.md) — the chat surface this tool plugs into.
- [features/chat-visitor.md](./chat-visitor.md) — the parallel public chat, which is intentionally scoped narrower.
- [architecture/multi-agent-chat.md](../architecture/multi-agent-chat.md) — how the visitor and admin agents diverge on tool scope.
- [features/chat-email-tools.md](./chat-email-tools.md) — example of a tool the visitor agent owns but the admin agent does not (the
  asymmetry runs both directions).

## User behaviour

When Cem asks the workspace assistant something time-sensitive or external — current prices, recent releases, library docs, sports results,
"what's the latest on X" — the agent reaches for `googleSearch` instead of answering from its training cutoff. The synthesized answer comes
back inline; the sources are inlined as `[title](url)` markdown links beside the relevant sentences so the existing `<AssistantMarkdown>`
renderer turns them into clickable anchors. Cem can click through to verify any claim.

The agent is prompted to **skip** search for things it can already answer:

- Facts about Cem already in the profile-summary block of its prompt.
- Workspace data (projects, tasks) — that goes through `delegateToProjects`, which has the live snapshot.
- Pure reasoning / arithmetic / code questions.

The system prompt caps it at one search per turn (with one refinement allowed if the first result set is thin) so the agent does not chain
searches indefinitely.

## Scope

**Admin only.** The visitor agent (`agentVisitorAboutCem`) is deliberately scoped to answering about Cem and to the three transactional
email-shaped tools. Adding web search there would turn the visitor chat from "Ask me anything about Cem" into a general-purpose chatbot,
which dilutes the product, expands the moderation surface, and invites quota burn from anonymous traffic. If a real visitor use case emerges
later (e.g. "find recent press about Cem"), we can revisit with a narrower, allowlisted variant.

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

| File                                          | What it does                                                                                                          |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `src/server/domain/ServerRuntime.ts`          | Adds `webSearchTool: () => Tool` to the `ai` factory surface so the provider binding has a single home.               |
| `src/server/domain/serverRuntimeCreate.ts`    | Binds `webSearchTool` to `google.tools.googleSearch({})`. Keeps `@ai-sdk/google` out of the agent files.              |
| `src/server/agents/toolWebSearch.ts`          | Thin wrapper returning `serverRuntime.ai.webSearchTool()`. Matches the one-tool-per-file convention.                  |
| `src/server/agents/agentPersonalAssistant.ts` | Registers `googleSearch: toolWebSearch(...)` in `tools:` and teaches the system prompt when to use / when to skip it. |
| `src/server/test/commandTestUtils.ts`         | Stubs `webSearchTool` on the mock `ServerRuntime` so command tests keep building without hitting Gemini.              |

The visitor agent (`agentVisitorAboutCem`) is not touched.

## Model compatibility

Every model in the current admin catalog (`adminChatModels.ts`) is Gemini 2.5 or 3.5; all of them accept function tools and Google Search
grounding in the same request. Older Gemini guidance forbade the combo — if we ever add a 1.x model to the catalog, gate it by adding a
`supportsWebSearch` flag to `AdminChatModelDefinition` and filtering it out of the tool registration. Not added speculatively.

## Citation rendering

The agent inlines `[title](url)` markdown links directly in its reply text. The existing `<AssistantMarkdown>` (Streamdown) component
already renders links as anchors, so there is no new UI. The raw `groundingMetadata` arrives on `providerMetadata.google` for the relevant
step and is currently not surfaced — if we later want a structured "Sources" block under the message (one of the
[alternatives considered](#why-googles-grounding-tool)), that data is the entry point.

## Anti-patterns avoided

- **No `execute` for `googleSearch`.** Gemini runs the search itself; writing an `execute` would either silently shadow the provider call or
  fail at validation. The wrapper returns the provider tool as-is.
- **Not on the visitor agent.** See [Scope](#scope).
- **Not in `agentPersonalAssistantProjects`.** Search is an orchestrator-level capability; the projects sub-agent only owns project/task
  mutations. If the projects sub-agent ever needs an external lookup, that's a signal the work belongs back in the orchestrator.
