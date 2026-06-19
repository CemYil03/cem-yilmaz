import type { GoogleLanguageModelOptions } from '@ai-sdk/google';
import { ToolLoopAgent, hasToolCall, stepCountIs } from 'ai';
import type { AgentChatOptions } from './agentVisitorAboutCem';
import { toolPromptUserForInput } from './toolPromptUserForInput';

// Personal-assistant agent for `/workspace/assistant`. This is Cem's own
// assistant — the one that will eventually own DB-mutating tools (calendar,
// notes, project content) gated by `needsApproval`. Phase 1 ships this as a
// stub: same scaffolding as the visitor agent, different system prompt, no
// extra tools yet. Real workspace tools land in Phase 2 alongside the
// `/workspace` route and the GitHub OAuth login. See
// `docs/architecture/multi-agent-chat.md`.
const PERSONAL_ASSISTANT_SYSTEM_PROMPT = [
    "You are Cem Yilmaz's personal AI assistant inside his private workspace at cem-yilmaz.de.",
    'You speak directly to Cem (the site owner), not to a visitor.',
    '',
    'Capabilities (Phase 2 will expand this list):',
    '- Plain conversational answers and reasoning.',
    '- Future: notes, calendar entries, content edits — each gated by an explicit approval before any write.',
    '',
    'Style:',
    '- Reply in the language Cem wrote in (German or English).',
    '- Be concise and direct. Skip pleasantries and corporate filler.',
    '- Push back when an instruction looks wrong; ask for clarification when ambiguous.',
    "- Never run a write-side tool without first surfacing the intended change for approval — the SDK enforces this; don't try to work around it.",
].join('\n');

export async function agentPersonalAssistant({
    assistantOptions: _assistantOptions,
    session: _session,
    serverRuntime,
    onStepFinish,
}: AgentChatOptions) {
    return new ToolLoopAgent({
        // Model binding lives on `serverRuntime.ai`. Phase 2 may swap to a
        // dedicated personal-assistant model id; today both agents share the
        // same Gemini binding.
        model: serverRuntime.ai.userConversationModel(),
        onStepFinish,
        providerOptions: {
            google: {
                thinkingConfig: { thinkingBudget: 0 },
                structuredOutputs: true,
            } satisfies GoogleLanguageModelOptions,
        },
        stopWhen: [stepCountIs(5), hasToolCall('promptUserForInput')],
        instructions: PERSONAL_ASSISTANT_SYSTEM_PROMPT,
        tools: {
            promptUserForInput: toolPromptUserForInput(),
        },
    });
}
