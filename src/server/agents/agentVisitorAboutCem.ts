import type { GoogleLanguageModelOptions } from '@ai-sdk/google';
import type { ToolLoopAgentOnStepFinishCallback } from 'ai';
import { ToolLoopAgent, hasToolCall, stepCountIs } from 'ai';
import type { GqlCChatAssistantOptions } from '../../web/graphql/generated';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { toolPromptUserForInput } from './toolPromptUserForInput';

export interface AgentChatOptions {
    assistantOptions: GqlCChatAssistantOptions;
    session: GqlSSession;
    serverRuntime: ServerRuntime;
    // The tool set the agent is built with is heterogeneous (one entry per
    // approval-gated tool plus `promptUserForInput`), each with its own Zod
    // input schema. There is no single concrete `ToolSet` the caller can name
    // upfront — and the on-step callback only reads the structurally-uniform
    // bits (`step.content`, `step.toolCalls`, `step.toolResults`) — so a wide
    // `any` here keeps the call signature tractable. Tightening would mean
    // exporting a precise tool-set type from the agent and threading it
    // through every onStepFinish caller.
    onStepFinish: ToolLoopAgentOnStepFinishCallback<any>;
}

// Shared agent factory signature for the chat surfaces. The mutation-resolver
// dispatch passes one of these into `chatAssistantTurnRunDetached` based on
// the access path — visitor mutations pass `agentVisitorAboutCem`; admin
// mutations pass `agentPersonalAssistant`. Each agent ships its own
// concretely-typed `ToolLoopAgent` (the toolset is heterogeneous and the
// generic parameters differ); all the runner needs is the structural surface
// (`stream`, `generate`, `onStepFinish`), so the runtime type stays wide.
// See `docs/architecture/multi-agent-chat.md`.
export type ChatAgentFactory = (options: AgentChatOptions) => Promise<{
    stream: (...args: any[]) => any;
    generate: (...args: any[]) => any;
}>;

// System prompt for the public visitor chat ("Ask me anything") on
// cem-yilmaz.de. The bio block below is intentionally a placeholder — fill in
// the real content before launch.
const VISITOR_SYSTEM_PROMPT = [
    "You are the AI assistant on Cem Yilmaz's personal website (cem-yilmaz.de).",
    "Your job is to answer visitors' questions about Cem, his projects, and this site.",
    '',
    'About Cem (TODO: replace before launch):',
    '- Software engineer based in Germany.',
    '- Builds full-stack web apps in TypeScript / React / Node.',
    '- This site is both his portfolio and his private platform; the public part shows projects, blog posts, and curated web tools.',
    '',
    'Style:',
    '- Reply in the language the visitor wrote in (German or English). If unclear, default to English.',
    '- Be concise, warm, and direct. Avoid corporate filler.',
    "- If asked something you don't know about Cem, say so — do not invent biography, employers, or credentials.",
    '- Politely steer off-topic questions back to Cem, his work, or this site.',
    "- Never claim to be a human; if asked, say you're an AI assistant Cem set up to answer visitor questions.",
].join('\n');

export async function agentVisitorAboutCem({
    assistantOptions: _assistantOptions,
    session: _session,
    serverRuntime,
    onStepFinish,
}: AgentChatOptions) {
    return new ToolLoopAgent({
        // Provider, model id, and API key are bound on the runtime
        // (`serverRuntimeCreate`) so this agent can be exercised against a
        // mock `LanguageModel` in tests without ever calling the real Gemini
        // endpoint.
        model: serverRuntime.ai.userConversationModel(),
        onStepFinish,
        providerOptions: {
            google: {
                // Disabling thinking prevents MALFORMED_FUNCTION_CALL errors where
                // Gemini 2.5 Flash generates Python-style calls instead of JSON.
                // See: https://github.com/googleapis/python-genai/issues/2081
                thinkingConfig: { thinkingBudget: 0 },
                // Constrained decoding so tool calls are valid JSON matching the
                // declared schema. Without this Gemini freely invents field
                // names (e.g. `input_type: "DATE"` with `name`/`label`) instead
                // of using the schema's `kind` discriminator. Pairs with the
                // intentionally-flat (non-discriminatedUnion) shape in
                // `toolPromptUserForInput.ts`.
                structuredOutputs: true,
            } satisfies GoogleLanguageModelOptions,
        },
        stopWhen: [
            // Hard ceiling so a runaway loop can't burn through quota.
            stepCountIs(5),
            // `promptUserForInput` hands the turn back to the human — there is
            // no tool result to feed the LLM, so without this the model would
            // keep stepping and (with Gemini) tend to apologize that "the tool
            // failed". The next assistant turn happens after the user submits
            // a `ChatMessageUserInput`, which `toModelMessages` replays as the
            // matching tool-result.
            hasToolCall('promptUserForInput'),
        ],
        instructions: VISITOR_SYSTEM_PROMPT,
        // No real DB tools today — the visitor chat is read-only. Approval
        // gating is left wired anyway so the SDK's tool-approval lifecycle
        // (suspend → request → respond → run execute) keeps being exercised
        // by the chat-respond command and its tests; the personal-assistant
        // agent uses it in earnest.
        tools: {
            promptUserForInput: toolPromptUserForInput(),
        },
    });
}
