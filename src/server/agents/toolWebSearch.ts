import type { Tool } from 'ai';
import type { ServerRuntime } from '../domain/ServerRuntime';

// --- toolWebSearch -----------------------------------------------------------
//
// Provider-executed Google Search grounding. Unlike the other tools in this
// directory, there is no `execute` function we own: Gemini runs the search
// server-side, returns the synthesized text alongside `groundingMetadata`
// (cited URIs + titles) on `providerMetadata.google`, and rides the call
// back through the normal `step.toolCalls` / `step.toolResults` channel
// just like any other tool. The agent is expected to inline the cited URLs
// as `[title](url)` markdown links in its reply so the existing
// `<AssistantMarkdown>` renderer turns them into clickable sources — see
// `docs/features/chat-web-search.md`.
//
// Only `agentPersonalAssistant` (admin workspace) registers this tool. The
// visitor agent (`agentVisitor`) is deliberately kept narrow to
// answering about Cem — see the "Scope" section in
// `docs/features/chat-web-search.md`.
//
// The provider binding lives on `serverRuntime.ai.webSearchTool`
// (`serverRuntimeCreate.ts`) so `@ai-sdk/google` stays out of the agent
// files and tests can stub the tool factory without importing the
// production provider.

export interface ToolWebSearchOptions {
    serverRuntime: ServerRuntime;
}

export function toolWebSearch({ serverRuntime }: ToolWebSearchOptions): Tool {
    return serverRuntime.ai.webSearchTool();
}
