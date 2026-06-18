import type { GoogleLanguageModelOptions } from '@ai-sdk/google';
import type { ToolLoopAgentOnStepFinishCallback } from 'ai';
import { ToolLoopAgent, hasToolCall, stepCountIs } from 'ai';
import type { GqlCChatAssistantOptions } from '../../web/graphql/generated';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { toolPromptUserForInput } from './toolPromptUserForInput';
import { toolWriteToConsole } from './toolWriteToConsole';

interface AgentUserConversationOptions {
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

export async function agentUserConversation({
    assistantOptions,
    session: _session,
    serverRuntime,
    onStepFinish,
}: AgentUserConversationOptions) {
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
        instructions: 'You are a helpful assistant.',
        // Approval gating is per-chat: when `requireToolCallApprovals` is on,
        // the AI SDK suspends the loop on the gated call and emits a
        // `tool-approval-request` content part instead of executing. The
        // human's decision lands as a `chatMessagesToolApprovalResponse` row
        // and is replayed (by `toModelMessages`) as a `tool-approval-response`
        // part on the next turn — at which point the SDK runs `execute`
        // itself. We never call `execute` manually.
        tools: {
            promptUserForInput: toolPromptUserForInput(),
            writeToConsole: toolWriteToConsole({ needsApproval: assistantOptions.requireToolCallApprovals }),
        },
    });
}
