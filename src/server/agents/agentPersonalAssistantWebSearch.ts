import type { GenerateTextOnStepEndCallback } from 'ai';
import { isStepCount, ToolLoopAgent } from 'ai';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { ADMIN_CHAT_MODEL_FALLBACK_ID } from './adminChatModels';
import { currentDateForAgent, googleAgentProviderOptionsFor } from './agentScaffolding';
import { toolWebSearch } from './toolWebSearch';

// Web-search sub-agent under the orchestrator pattern documented in
// `docs/architecture/agent-delegation.md`. Runs in-process inside the
// `toolDelegateToWebSearch` tool's `execute`. Exists for one reason: the
// Gemini 2.5 family rejects requests that mix provider-defined tools
// (Google Search grounding) with function tools (`promptUserForInput`,
// `delegateToProjects`) in the same call — the AI SDK surfaces the
// upstream limitation as the warning "The feature 'combination of
// function and provider-defined tools' is not supported." Gemini 3 lifts
// the restriction, but the admin can choose 2.5 from the composer, so the
// wrap is the lower-common-denominator fix. The orchestrator only ever
// sees function tools (the delegate); the sub-agent only ever sees the
// provider tool.
//
// Mirrors `agentPersonalAssistantProjects` in shape but is intentionally
// thinner: no mutation log (search has no side effects), no needsMoreInfo
// sentinel (the search is provider-executed in one round-trip — there is
// nothing meaningful to ask the user mid-search). The sub-agent's final
// text is the entire `toolResult` payload.

export interface WebSearchAgentOptions {
    session: GqlSSession;
    serverRuntime: ServerRuntime;
    // Plumbed through from the delegate tool. Receives every step the
    // sub-agent takes and writes each tool call as a `chatMessagesToolCall`
    // row stamped with the delegate row's id as `parentChatMessageId`. The
    // delegate tool builds this from the shared `chatPersistStep` helper —
    // see `toolDelegateToWebSearch.ts`.
    onStepEnd?: GenerateTextOnStepEndCallback<any>;
}

function buildSystemPrompt(): string {
    return [
        "You are the web-search sub-agent inside Cem's personal workspace. The orchestrator hands you a single",
        'natural-language search brief; you call `googleSearch` (Google grounding) and return a focused written',
        'answer.',
        '',
        currentDateForAgent(),
        '',
        'How to work:',
        "- Call `googleSearch` with a query tailored to the brief. If the first round of results doesn't answer",
        '  the brief, refine the query and search once more — at most two searches per delegation.',
        '- Cite the most useful sources inline as `[title](url)` markdown links beside the relevant sentence —',
        '  the orchestrator forwards your answer to the user and the chat renderer turns these into clickable',
        '  anchors. Do not append a separate "Sources:" block; the inline links are the citations.',
        "- Reply in the language the brief is written in (German or English). Match the brief's register.",
        '- Be concise: a focused paragraph or two, not a full report. The orchestrator may quote your answer',
        '  verbatim or summarize further.',
        '- If the search returns nothing useful even after a refinement, say so plainly — do not invent facts.',
        '',
        'You do NOT have any other tools. No project mutations, no user-input forms, no email. If the brief is not',
        'really a search request (e.g. "create a project"), reply with one sentence saying you can\'t help with',
        'that here; the orchestrator will route it elsewhere.',
    ].join('\n');
}

export async function agentPersonalAssistantWebSearch({ serverRuntime, onStepEnd }: WebSearchAgentOptions) {
    // Sub-agent always runs on the catalog fallback (Flash) — independent
    // of the orchestrator's per-turn model pick. Resolved here so the same
    // id binds both the model and the Flash-specific provider options.
    // The fallback is also the cheapest model in the catalog, which is the
    // right tier for a single grounded search round-trip.
    const modelId = ADMIN_CHAT_MODEL_FALLBACK_ID;
    return new ToolLoopAgent({
        model: serverRuntime.ai.userConversationModel(modelId),
        onStepEnd,
        providerOptions: googleAgentProviderOptionsFor(modelId),
        // Tight ceiling — one search, optional refinement, final text.
        stopWhen: [isStepCount(4)],
        instructions: buildSystemPrompt(),
        // Single tool. No function tools alongside it — this is the whole
        // point of the wrap, see the top-of-file comment.
        tools: {
            googleSearch: toolWebSearch({ serverRuntime }),
        },
    });
}
