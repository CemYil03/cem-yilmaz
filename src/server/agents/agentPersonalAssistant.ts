import { ToolLoopAgent, hasToolCall, isStepCount } from 'ai';
import type { AgentChatOptions } from './agentVisitorAboutCem';
import { adminChatConfigGet } from '../queries/adminChatConfigGet';
import { profileSummaryGet } from '../queries/profileSummaryGet';
import { currentDateForAgent, googleAgentProviderOptions } from './agentScaffolding';
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
    '',
    'Deep-link templates — whenever you mention a row Cem might want to open right now, format it as a markdown',
    'link to its deep-link URL. The chat renderer turns these into clickable anchors. Use the ids surfaced in',
    "`delegateToProjects`'s `mutations` array (each entry has `id` and `title`), or ids the sub-agent named in its",
    '`summary`. Never invent an id; if you do not have one, just name the thing in plain text.',
    '- Project              → `[<title>](/workspace/projects?tab=projects&focus=<projectId>)`',
    '- Inbox row            → `[<title>](/workspace/projects?tab=inbox&focus=<projectRequestId>)`',
    '- Standalone task      → `[<title>](/workspace/projects?tab=todos&focus=<taskId>)`',
    '- Visitor chat         → `[<title>](/workspace/visitor-chats?chatId=<chatId>)`',
    'Examples of the right shape, given a `mutations` entry like `{ kind: "projectCreate", id: "4f2a…", title: "Acme rebuild" }`:',
    '- Good: "Created [Acme rebuild](/workspace/projects?tab=projects&focus=4f2a…) under planning."',
    '- Bad:  "Created Acme rebuild." (no link — the user has to hunt for the card)',
].join('\n');

function buildSystemPrompt(profileSummary: string): string {
    // `currentDateForAgent()` is called here (not woven into the base
    // constant) so it re-evaluates on every user turn instead of freezing to
    // module-load time.
    const dated = [currentDateForAgent(), '', BASE_SYSTEM_PROMPT].join('\n');
    if (!profileSummary.trim()) return dated;
    return [
        dated,
        '',
        'Context about Cem (synthesized from prior conversations — refine your answers with these facts when relevant):',
        profileSummary.trim(),
    ].join('\n');
}

export async function agentPersonalAssistant({
    assistantOptions,
    session,
    serverRuntime,
    chatId,
    preWrittenToolCallIds,
    onStepEnd,
}: AgentChatOptions) {
    const profileSummary = await profileSummaryGet(serverRuntime);
    // Per-turn model: the admin composer surfaces a dropdown bound to the
    // catalog (`adminChatModels.ts`); each chat send carries the picked
    // `modelId` on `assistantOptions`. When omitted (a non-composer code path,
    // or a pre-existing client without the field) we fall back to the admin's
    // persisted default. The runtime factory validates the resolved id
    // against the catalog and throws on unknown ids. See
    // `docs/features/admin-chat-config.md`.
    const requestedModelId = assistantOptions.modelId ?? null;
    const resolvedModelId = requestedModelId ?? (await adminChatConfigGet(serverRuntime.db)).defaultModelId;
    return new ToolLoopAgent({
        // Model binding lives on `serverRuntime.ai`. The admin chooses per
        // turn via the composer dropdown; `requestedModelId` carries that
        // selection through `ChatAssistantOptions.modelId`.
        model: serverRuntime.ai.userConversationModel(resolvedModelId),
        onStepEnd,
        providerOptions: googleAgentProviderOptions,
        // Bumped to 8 — a single user turn can now chain "delegate → user
        // input → delegate again" plus a final-text step, and 5 ran out in
        // practice.
        stopWhen: [isStepCount(8), hasToolCall('promptUserForInput')],
        instructions: buildSystemPrompt(profileSummary),
        tools: {
            promptUserForInput: toolPromptUserForInput(),
            // Delegate tool persists sub-agent tool calls under its own
            // pre-written row via the `chatId` + `preWrittenToolCallIds` it
            // receives here. See
            // `docs/architecture/agent-delegation.md` ("Nested tool calls").
            delegateToProjects: toolDelegateToProjects({
                serverRuntime,
                session,
                chatId,
                generationId: assistantOptions.generationId,
                preWrittenToolCallIds,
            }),
        },
    });
}
