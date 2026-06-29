import { ToolLoopAgent, hasToolCall, stepCountIs } from 'ai';
import type { AgentChatOptions } from './agentVisitorAboutCem';
import { profileSummaryGet } from '../queries/profileSummaryGet';
import { googleAgentProviderOptions } from './agentScaffolding';
import { toolDelegateToProjects } from './toolDelegateToProjects';
import { toolPromptUserForInput } from './toolPromptUserForInput';

// Personal-assistant agent for `/workspace/assistant`. This is the
// orchestrator in the agent-delegation pattern: it owns the user-facing
// turn but does not directly own most domain tools. Project/task work is
// handed off to `agentPersonalAssistantProjects` via `delegateToProjects`;
// future domains (calendar, notes, fitness, …) follow the same shape. See
// `docs/architecture/agent-delegation.md` and `multi-agent-chat.md`.
//
// The base prompt is rendered with a `{profile}` block at the end. On each
// turn the agent reads `profile.summary` via `profileSummaryGet` and the
// resulting text is prepended right above the style rules so the assistant
// answers with that context already in mind. The summary is the ONLY profile
// artifact that crosses back into a prompt — `prose` and `psychProfile` are
// firewalled at the query layer. See `docs/features/profile.md`.
const BASE_SYSTEM_PROMPT = [
    "You are Cem Yilmaz's personal AI assistant inside his private workspace at cem-yilmaz.de.",
    'You speak directly to Cem (the site owner), not to a visitor.',
    '',
    'Capabilities:',
    '- Plain conversational answers and reasoning.',
    '- Project and task management via `delegateToProjects` — see "When to delegate" below.',
    '- Future: notes, calendar entries, content edits — each in its own sub-agent under the same delegation pattern.',
    '',
    'When to delegate:',
    '- ANY ask that touches the workspace projects board or its tasks — listing, creating, updating, archiving,',
    '  deleting, summarizing progress, moving tasks across projects — goes to `delegateToProjects` with a',
    "  natural-language brief. Pass the user's request verbatim plus any context from earlier turns (an id you",
    '  resolved, a date the user named). The sub-agent has the live board snapshot in its own prompt.',
    "- The delegate result is `{ status, summary, mutations?, missingFields? }`. On `status: 'needsMoreInfo'`,",
    '  call `promptUserForInput` to gather the slots named in `missingFields`, then call `delegateToProjects`',
    "  again with the brief enriched by the answers. On `status: 'noOp'`, handle the ask yourself (it was not",
    "  really about projects). On `status: 'completed'`, narrate `summary` back to Cem; mention specific",
    '  mutations (created/updated/deleted) when they help him confirm what happened.',
    '- Do NOT try to do project/task work by chatting — always delegate. Conversely, do not delegate non-project',
    '  questions (small talk, code help, general reasoning).',
    '',
    'Style:',
    '- Reply in the language Cem wrote in (German or English).',
    '- Be concise and direct. Skip pleasantries and corporate filler.',
    '- Push back when an instruction looks wrong; ask for clarification when ambiguous.',
].join('\n');

function buildSystemPrompt(profileSummary: string): string {
    if (!profileSummary.trim()) return BASE_SYSTEM_PROMPT;
    return [
        BASE_SYSTEM_PROMPT,
        '',
        'Context about Cem (synthesized from prior conversations — refine your answers with these facts when relevant):',
        profileSummary.trim(),
    ].join('\n');
}

export async function agentPersonalAssistant({
    assistantOptions: _assistantOptions,
    session,
    serverRuntime,
    onStepFinish,
}: AgentChatOptions) {
    const profileSummary = await profileSummaryGet(serverRuntime);
    return new ToolLoopAgent({
        // Model binding lives on `serverRuntime.ai`. Phase 2 may swap to a
        // dedicated personal-assistant model id; today both agents share the
        // same Gemini binding.
        model: serverRuntime.ai.userConversationModel(),
        onStepFinish,
        providerOptions: googleAgentProviderOptions,
        // Bumped to 8 — a single user turn can now chain "delegate → user
        // input → delegate again" plus a final-text step, and 5 ran out in
        // practice.
        stopWhen: [stepCountIs(8), hasToolCall('promptUserForInput')],
        instructions: buildSystemPrompt(profileSummary),
        tools: {
            promptUserForInput: toolPromptUserForInput(),
            delegateToProjects: toolDelegateToProjects({ serverRuntime, session }),
        },
    });
}
