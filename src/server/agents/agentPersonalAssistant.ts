import { ToolLoopAgent, hasToolCall, isStepCount } from 'ai';
import type { AgentChatOptions } from './agentVisitorAboutCem';
import { adminChatConfigGet } from '../queries/adminChatConfigGet';
import { compassSummaryGet } from '../queries/compassSummaryGet';
import { ADMIN_CHAT_MODEL_FALLBACK_ID, isAdminChatModelId } from './adminChatModels';
import { currentDateForAgent, googleAgentProviderOptionsFor } from './agentScaffolding';
import { toolDelegateToMedia } from './toolDelegateToMedia';
import { toolDelegateToMedical } from './toolDelegateToMedical';
import { toolDelegateToProjects } from './toolDelegateToProjects';
import { toolDelegateToWebSearch } from './toolDelegateToWebSearch';
import { toolPromptUserForInput } from './toolPromptUserForInput';

// Personal-assistant agent for `/workspace/assistant`. This is the
// orchestrator in the agent-delegation pattern: it owns the user-facing
// turn but does not directly own most domain tools. Project/task work is
// handed off to `agentPersonalAssistantProjects` via `delegateToProjects`;
// future domains (calendar, notes, fitness, …) follow the same shape. See
// `docs/architecture/agent-delegation.md` and `multi-agent-chat.md`.
//
// The base prompt is rendered with a `{compass}` block at the end. On each
// turn the agent reads `compass.summary` via `compassSummaryGet` and the
// resulting text is prepended right above the style rules so the assistant
// answers with that context already in mind. The summary is the ONLY compass
// artifact that crosses back into a prompt — `prose` and `psychology` are
// firewalled at the query layer. See `docs/features/compass.md`.
const BASE_SYSTEM_PROMPT = [
    "You are Cem Yilmaz's personal AI assistant inside his private workspace at cem-yilmaz.de.",
    'You speak directly to Cem (the site owner), not to a visitor.',
    '',
    'Capabilities:',
    '- Plain conversational answers and reasoning.',
    '- Project and task management via `delegateToProjects` — see "When to delegate" below.',
    '- Movie watchlist and favourite-channels management via `delegateToMedia` — same pattern.',
    '- Health journal and medical appointments via `delegateToMedical` — same pattern.',
    '- Web search via `delegateToWebSearch` — see "When to search" below.',
    '- Future: notes, calendar entries, content edits — each in its own sub-agent under the same delegation pattern.',
    '',
    'When to delegate:',
    '- ANY ask that touches the workspace projects board or its tasks — listing, creating, updating, archiving,',
    '  deleting, summarizing progress, moving tasks across projects — goes to `delegateToProjects` with a',
    "  natural-language brief. Pass the user's request verbatim plus any context from earlier turns (an id you",
    '  resolved, a date the user named). The sub-agent has the live board snapshot in its own prompt.',
    '- ANY ask that touches movies (watchlist, ratings, "did I watch X", "add Y to my watchlist", "what should I',
    '  watch tonight") or favourite channels (adding a YouTube channel, listing tech YouTubers, editing topics)',
    '  goes to `delegateToMedia` with the same shape. The sub-agent has its own TMDB search tool — you do NOT',
    '  need `delegateToWebSearch` for film metadata.',
    '- ANY ask that touches health (symptoms, injuries, "log this rash", "what should I do about X") or medical',
    '  appointments (scheduling, "I just went to the dentist", "when is my next visit due") goes to',
    '  `delegateToMedical`. The sub-agent is a **documentarian with gentle triage** — it captures what Cem tells',
    '  it into a structured record and can offer low-risk practical suggestions, but it does NOT diagnose or',
    '  prescribe. Do NOT try to answer medical questions yourself even if the sub-agent seems overkill for a',
    '  small ask — routing every health-adjacent turn through it keeps the disclaimer + red-flag rules in one',
    '  place. If Cem pasted a photo into this turn AND the topic is health-related, forward the `fileUploadIds`',
    '  in the delegate call so the sub-agent can attach the photo to the record it files. You may briefly',
    '  describe what the photo shows in the `brief` (the sub-agent does not see the bytes; you do).',
    "- The delegate result is `{ status, summary, mutations?, missingFields? }`. On `status: 'needsMoreInfo'`,",
    '  call `promptUserForInput` to gather the slots named in `missingFields`, then call the same delegate',
    "  again with the brief enriched by the answers. On `status: 'noOp'`, handle the ask yourself (it was not",
    "  really about that domain). On `status: 'completed'`, narrate `summary` back to Cem; mention specific",
    '  mutations (created/updated/deleted) when they help him confirm what happened.',
    "- On `status: 'failed'`, the sub-agent or one of its tools threw. `summary` is the one-line error message and",
    '  `mutations` lists any writes that DID land before the throw. Tell Cem plainly what failed (quote the',
    '  message) and what — if anything — persisted. Do NOT retry the same brief automatically, do NOT confabulate',
    '  reasons like "the tool is unreachable", and do NOT soften the failure into a hopeful follow-up. If a',
    '  retry is appropriate at all, ask Cem before doing it.',
    '- Do NOT try to do project/task work by chatting — always delegate. Conversely, do not delegate non-project',
    '  questions (small talk, code help, general reasoning).',
    '',
    'When to search:',
    '- Use `delegateToWebSearch` for facts that change over time or that you cannot answer from this prompt: current',
    '  prices, recent releases, news, library/API docs Cem might be evaluating, library version status, sports',
    '  results, anything time-sensitive. Pass a `briefs` array — one natural-language brief per independent question.',
    '  Each brief spins up its own web-search sub-agent and they all run in parallel, so batch naturally-parallel',
    '  questions ("compare React, Vue, Svelte", "latest on X and Y") into a single call. Use a single-item array',
    '  for a lone question. Prefer one batched delegation over chaining several — batching is why the input is an',
    '  array. Cap is 5 briefs per call.',
    '- The result is `{ status, results }` where each entry is `{ brief, status, summary }`. Batch `status` is',
    '  `completed` if every brief succeeded, `failed` if every brief threw, `partial` if some succeeded and some',
    "  did not. For each entry with `status: 'completed'`, `summary` is the sub-agent's written answer with sources",
    '  already inlined as `[title](url)` markdown links — quote or narrate it back to Cem; do NOT append a separate',
    '  "Sources:" block, the inline links are the citations. When several briefs succeed, weave their answers into',
    '  one reply and mention which brief each part came from when it helps Cem follow the thread. For each entry',
    "  with `status: 'failed'`, tell Cem plainly which brief failed and quote its `summary` (that's the one-line",
    '  error message); do NOT retry automatically and do NOT confabulate softer reasons like "search is unavailable".',
    '- Do NOT search for things that live in this prompt or in the workspace data: facts about Cem already in',
    '  the compass context, the contents of the projects board (use `delegateToProjects`), or arithmetic /',
    '  reasoning / code questions you can answer directly. Search costs a round-trip and adds latency — skip',
    '  it when the answer is already at hand.',
    '- Each sub-agent does up to one refinement internally before giving up. Do not chain delegations across turns',
    '  when one batched call would cover the ground.',
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
    '- Standalone task      → `[<title>](/workspace/todos?focus=<taskId>)`',
    '- Movie                → `[<title>](/workspace/media?tab=movies&focus=<movieId>)`',
    '- Channel              → `[<name>](/workspace/media?tab=channels&focus=<channelId>)`',
    '- Medical record       → `[<title>](/workspace/medical?tab=records&focus=<recordId>)`',
    '- Medical appointment  → `[<title>](/workspace/medical?tab=appointments&focus=<appointmentId>)`',
    '- Visitor chat         → `[<title>](/workspace/visitor-chats?chatId=<chatId>)`',
    'Examples of the right shape, given a `mutations` entry like `{ kind: "projectCreate", id: "4f2a…", title: "Acme rebuild" }`:',
    '- Good: "Created [Acme rebuild](/workspace/projects?tab=projects&focus=4f2a…) under planning."',
    '- Bad:  "Created Acme rebuild." (no link — the user has to hunt for the card)',
].join('\n');

function buildSystemPrompt(compassSummary: string, currentPagePath: string | null): string {
    // `currentDateForAgent()` is called here (not woven into the base
    // constant) so it re-evaluates on every user turn instead of freezing to
    // module-load time.
    const dated = [currentDateForAgent(), '', BASE_SYSTEM_PROMPT].join('\n');
    // `currentPagePath` is the route Cem's browser was on when he sent
    // this message (`/workspace/projects`, `/workspace/projects/abc…`,
    // `/workspace/cv`, …). Inline it so "what am I looking at" / "open
    // this" / "summarize what's here" lands without him spelling out the
    // surface every time. The path itself is the only signal — the agent
    // does not see the rendered DOM.
    const sections = [dated];
    if (currentPagePath) {
        sections.push(
            '',
            'Current workspace surface:',
            `- You are answering while Cem is on \`${currentPagePath}\`.`,
            '- Treat this as Cem\'s implicit context for short references ("this project", "what am I looking at",',
            '  "open it"). Use it to disambiguate when the workspace path encodes a row id (e.g.',
            "  `/workspace/projects/<projectId>`). When the path is unrelated to what he's asking, ignore it.",
        );
    }
    if (compassSummary.trim()) {
        sections.push(
            '',
            'Context about Cem (synthesized from prior conversations — refine your answers with these facts when relevant):',
            compassSummary.trim(),
        );
    }
    return sections.join('\n');
}

export async function agentPersonalAssistant({
    assistantOptions,
    session,
    serverRuntime,
    chatId,
    currentPagePath,
    preWrittenToolCallIds,
    onStepEnd,
}: AgentChatOptions) {
    const compassSummary = await compassSummaryGet(serverRuntime);
    // Per-turn model: the admin composer surfaces a dropdown bound to the
    // catalog (`adminChatModels.ts`); each chat send carries the picked
    // `modelId` on `assistantOptions`. When omitted (a non-composer code path,
    // or a pre-existing client without the field) we fall back to the admin's
    // persisted default. The runtime factory validates the resolved id
    // against the catalog and throws on unknown ids. See
    // `docs/features/admin-chat-config.md`.
    const requestedModelId = assistantOptions.modelId ?? null;
    // Validate the per-turn pick against the catalog the same way
    // `adminChatConfigGet` validates the persisted default — if a deploy
    // removed the model the composer last surfaced, fall back rather than
    // letting `serverRuntime.ai.userConversationModel` throw inside the
    // agent factory (which used to bubble up as a silent
    // `delegateToProjects` failure with no log entry — see the try/catch
    // in `toolDelegateToProjects.ts`). Logged so a stale composer cache
    // doesn't go invisible.
    let resolvedModelId: string;
    if (requestedModelId && isAdminChatModelId(requestedModelId)) {
        resolvedModelId = requestedModelId;
    } else {
        if (requestedModelId) {
            serverRuntime.log.error(
                new Error(`agentPersonalAssistant: requested modelId '${requestedModelId}' is not in the catalog; falling back`),
                session,
            );
        }
        const persisted = (await adminChatConfigGet(serverRuntime.db)).defaultModelId;
        resolvedModelId = isAdminChatModelId(persisted) ? persisted : ADMIN_CHAT_MODEL_FALLBACK_ID;
    }
    return new ToolLoopAgent({
        // Model binding lives on `serverRuntime.ai`. The admin chooses per
        // turn via the composer dropdown; `requestedModelId` carries that
        // selection through `ChatAssistantOptions.modelId`.
        model: serverRuntime.ai.userConversationModel(resolvedModelId),
        onStepEnd,
        providerOptions: googleAgentProviderOptionsFor(resolvedModelId),
        // Bumped to 8 — a single user turn can now chain "delegate → user
        // input → delegate again" plus a final-text step, and 5 ran out in
        // practice.
        stopWhen: [isStepCount(8), hasToolCall('promptUserForInput')],
        instructions: buildSystemPrompt(compassSummary, currentPagePath),
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
            // Media sub-agent — movies + favourite channels. TMDB search
            // lives inside this sub-agent as its own tool; the orchestrator
            // never needs to search TMDB itself.
            delegateToMedia: toolDelegateToMedia({
                serverRuntime,
                session,
                chatId,
                generationId: assistantOptions.generationId,
                preWrittenToolCallIds,
            }),
            // Medical sub-agent — health journal + appointments. Documentarian
            // with gentle triage; red-flag rules embedded in the sub-agent's
            // system prompt. When Cem attaches a photo AND the topic is
            // health-related, the orchestrator forwards `fileUploadIds` here
            // so the sub-agent can attach the file to the record it files.
            // See `docs/features/workspace-medical.md`.
            delegateToMedical: toolDelegateToMedical({
                serverRuntime,
                session,
                chatId,
                generationId: assistantOptions.generationId,
                preWrittenToolCallIds,
            }),
            // Web search lives behind its own delegate sub-agent for one
            // reason: Gemini 2.5 rejects requests that mix provider-defined
            // tools (`googleSearch` grounding) with function tools in the
            // same call — the AI SDK surfaces this as the warning
            // "combination of function and provider-defined tools is not
            // supported". Gemini 3 lifts the restriction, but the admin can
            // pick 2.5 from the composer, so the wrap is the
            // lower-common-denominator fix. The orchestrator only sees
            // function tools; the search sub-agent only sees the provider
            // tool. See `docs/features/chat-web-search.md`.
            delegateToWebSearch: toolDelegateToWebSearch({
                serverRuntime,
                session,
                chatId,
                generationId: assistantOptions.generationId,
                preWrittenToolCallIds,
            }),
        },
    });
}
