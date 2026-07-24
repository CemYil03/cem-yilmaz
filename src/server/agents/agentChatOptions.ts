import type { GenerateTextOnStepEndCallback } from 'ai';
import type { GqlCChatAssistantOptions } from '../../web/graphql/generated';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { ChatStepArtifact } from './chatStepArtifact';

// Shared options bag for every top-level chat agent factory
// (`agentVisitor`, `agentPersonalAssistant`). The mutation-resolver
// dispatch builds one of these and hands it to
// `chatAssistantTurnRunDetached`; each factory reads the fields it needs
// and ignores the rest. See `docs/architecture/chat.md`.
export interface AgentChatOptions {
    assistantOptions: GqlCChatAssistantOptions;
    session: GqlSSession;
    serverRuntime: ServerRuntime;
    // Id of the chat the agent is answering in. Threaded through so tools
    // that persist side-effect rows (`submitProjectRequest`) can record the
    // originating conversation; tools that don't need it ignore the value.
    chatId: string;
    // Pathname the client was on when the user sent the message
    // (`/projects`, `/en/cv`, `/workspace/projects/abc`, …). Inlined into
    // the agent's system prompt for this turn only — not persisted. Null
    // when the caller can't supply it (server-side tests). See
    // `docs/features/chat-visitor.md` and `docs/features/chat-workspace.md`.
    currentPagePath: string | null;
    // Shared mutable set the orchestrator uses to skip persisting a tool
    // call whose row some tool's `execute` already wrote up front (every
    // `delegateTo*` tool pre-writes its parent row so nested sub-agent
    // tool-call rows have a parent to FK against). Agents that don't host
    // any such tool ignore the value; `agentPersonalAssistant` is the one
    // that passes it into tools. See `docs/architecture/agent-delegation.md`
    // ("Nested tool calls").
    preWrittenToolCallIds: Set<string>;
    // Per-LLM-step id + reasoning buffer shared with the turn runner so
    // pre-written delegate rows reuse the live "Thinking…" slot id. Optional
    // for agents that never pre-write (visitor).
    stepArtifact?: ChatStepArtifact;
    // The tool set the agent is built with is heterogeneous (one entry per
    // approval-gated tool plus `promptUserForInput`), each with its own Zod
    // input schema. There is no single concrete `ToolSet` the caller can name
    // upfront — and the on-step callback only reads the structurally-uniform
    // bits (`step.content`, `step.toolCalls`, `step.toolResults`) — so a wide
    // `any` here keeps the call signature tractable. Tightening would mean
    // exporting a precise tool-set type from the agent and threading it
    // through every onStepEnd caller.
    onStepEnd: GenerateTextOnStepEndCallback<any>;
}

// Shared agent factory signature for the chat surfaces. The mutation-resolver
// dispatch passes one of these into `chatAssistantTurnRunDetached` based on
// the access path — visitor mutations pass `agentVisitor`; admin
// mutations pass `agentPersonalAssistant`. Each agent ships its own
// concretely-typed `ToolLoopAgent` (the toolset is heterogeneous and the
// generic parameters differ); all the runner needs is the structural surface
// (`stream`, `generate`, `onStepEnd`), so the runtime type stays wide.
// See `docs/architecture/chat.md`.
export type ChatAgentFactory = (options: AgentChatOptions) => Promise<{
    stream: (...args: any[]) => any;
    generate: (...args: any[]) => any;
}>;
