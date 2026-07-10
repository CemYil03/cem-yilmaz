import { ToolLoopAgent, hasToolCall, isStepCount } from 'ai';
import type { AgentChatOptions } from './agentVisitorAboutCem';
import { adminChatConfigFindOne } from '../queries/adminChatConfigFindOne';
import { compassSummaryFindOne } from '../queries/compassSummaryFindOne';
import { ADMIN_CHAT_MODEL_FALLBACK_ID, isAdminChatModelId } from './adminChatModels';
import { currentDateForAgent, googleAgentProviderOptionsFor } from './agentScaffolding';
import { toolDelegateToMedia } from './toolDelegateToMedia';
import { toolDelegateToMedical } from './toolDelegateToMedical';
import { toolDelegateToProjects } from './toolDelegateToProjects';
import { toolDelegateToTravel } from './toolDelegateToTravel';
import { toolDelegateToNutrition } from './toolDelegateToNutrition';
import { toolDelegateToFitness } from './toolDelegateToFitness';
import { toolDelegateToFinances } from './toolDelegateToFinances';
import { toolDelegateToInventory } from './toolDelegateToInventory';
import { toolDelegateToWebSearch } from './toolDelegateToWebSearch';
import { toolPromptUserForInput } from './toolPromptUserForInput';

// Personal-assistant agent for `/workspace/assistant`. This is the
// orchestrator in the agent-delegation pattern: it owns the user-facing
// turn but does not directly own most domain tools. AdminProject/task work is
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
    'You have a small set of tools; each tool carries its own description of when to reach for it and how its',
    'inputs are shaped. Read those descriptions and let them decide routing — do not narrate a domain to yourself,',
    'delegate. The `delegateTo*` tools each hand a natural-language brief off to a domain sub-agent; `promptUserForInput`',
    'collects typed values from Cem when the delegates need clarification.',
    '',
    'Handling delegate results (the shape every `delegateTo*` returns):',
    "- `{ status: 'completed', summary, mutations? }` — narrate `summary` back to Cem; mention specific mutations",
    '  (created / updated / deleted) when they help him confirm what happened.',
    "- `{ status: 'needsMoreInfo', missingFields, summary }` — call `promptUserForInput` for slots matching",
    '  `missingFields`, then call the same delegate again with the brief enriched by the answers.',
    "- `{ status: 'noOp', summary }` — the ask was not really about that domain; fall back to a plain conversational",
    '  reply or another tool.',
    "- `{ status: 'failed', summary, mutations }` — the sub-agent or one of its tools threw. `summary` is the",
    '  one-line error message; `mutations` lists any writes that DID land before the throw. Tell Cem plainly what',
    '  failed (quote the message) and what — if anything — persisted. Do NOT retry the same brief automatically,',
    '  do NOT confabulate reasons like "the tool is unreachable", and do NOT soften the failure into a hopeful',
    '  follow-up. If a retry is appropriate at all, ask Cem before doing it.',
    '',
    "For `delegateToWebSearch` the shape is different: `{ status: 'completed' | 'partial' | 'failed', results: [{",
    '  brief, status, summary }] }`. Batch `status` is `completed` if every brief succeeded, `failed` if every brief',
    "  threw, `partial` if some succeeded and some did not. For per-entry `completed`, `summary` is the sub-agent's",
    '  written answer with sources already inlined as `[title](url)` markdown links — quote or narrate it back to Cem;',
    '  do NOT append a separate "Sources:" block, the inline links are the citations. When several briefs succeed,',
    '  weave their answers into one reply and mention which brief each part came from when it helps Cem follow the',
    '  thread. For per-entry `failed`, tell Cem plainly which brief failed and quote its `summary`; do NOT retry',
    '  automatically. Do NOT search for things that live in this prompt or in the workspace data (facts about Cem in',
    '  the compass context, the projects board, arithmetic / reasoning / code questions you can answer directly).',
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
    '- AdminProject              → `[<title>](/workspace/projects?tab=projects&focus=<projectId>)`',
    '- Inbox row            → `[<title>](/workspace/projects?tab=inbox&focus=<projectRequestId>)`',
    '- Standalone task      → `[<title>](/workspace/todos?focus=<taskId>)`',
    '- AdminMediaMovie                → `[<title>](/workspace/media?tab=movies&focus=<movieId>)`',
    '- Series               → `[<title>](/workspace/media?tab=series&focus=<showId>)`',
    '- Channel              → `[<name>](/workspace/media?tab=channels&focus=<channelId>)`',
    '- Medical record       → `[<title>](/workspace/medical?tab=records&focus=<recordId>)`',
    '- Medical appointment  → `[<title>](/workspace/medical?tab=appointments&focus=<appointmentId>)`',
    '- Trip                 → `[<title>](/workspace/travel/<tripId>)`',
    '- Inventory item       → `[<name>](/workspace/inventory/<itemId>)`',
    '- AdminNutritionRecipe               → `[<title>](/workspace/nutrition?tab=cookbook&focus=<recipeId>)`',
    '- Diary entry          → `[<description>](/workspace/nutrition?tab=diary&focus=<logId>)`',
    '- Workout              → `[<title>](/workspace/fitness?tab=workouts&focus=<sessionId>)`',
    '- Routine              → `[<name>](/workspace/fitness?tab=routines&focus=<routineId>)`',
    '- AdminFitnessExercise             → `[<name>](/workspace/fitness?tab=exercises&focus=<exerciseId>)`',
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
    const compassSummary = await compassSummaryFindOne(serverRuntime);
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
        const persisted = (await adminChatConfigFindOne(serverRuntime.db)).defaultModelId;
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
            // Travel sub-agent — trips, day-by-day itinerary, packing list.
            // The whole point of this delegate is durable trip planning: the
            // itinerary lands in Postgres so a fresh chat session reads the
            // plan from `AdminTravelQuery.trip(...)` instead of replaying the
            // conversation. See `docs/features/workspace-travel.md`.
            delegateToTravel: toolDelegateToTravel({
                serverRuntime,
                session,
                chatId,
                generationId: assistantOptions.generationId,
                preWrittenToolCallIds,
            }),
            // Nutrition sub-agent — cookbook, soft meal plan, food/drink diary.
            // Suggests snacks/meals from what Cem likes, logs what he ate, and
            // plans the week. See `docs/features/workspace-nutrition.md`.
            delegateToNutrition: toolDelegateToNutrition({
                serverRuntime,
                session,
                chatId,
                generationId: assistantOptions.generationId,
                preWrittenToolCallIds,
            }),
            // Fitness sub-agent — gym log (sessions + sets), routines, exercise
            // catalog. Logs workouts from chat and answers progression
            // questions. See `docs/features/workspace-fitness.md`.
            delegateToFitness: toolDelegateToFitness({
                serverRuntime,
                session,
                chatId,
                generationId: assistantOptions.generationId,
                preWrittenToolCallIds,
            }),
            // Finances sub-agent — recurring costs (rent, insurance,
            // subscriptions, …) and the monthly net-income baseline. Writes to
            // Postgres so `/workspace/finances` and its totals update. This is
            // the "add this to my expenses / subscriptions" path. See
            // `docs/features/workspace-finances.md`.
            delegateToFinances: toolDelegateToFinances({
                serverRuntime,
                session,
                chatId,
                generationId: assistantOptions.generationId,
                preWrittenToolCallIds,
            }),
            // Inventory sub-agent — material belongings (electronics,
            // appliances, furniture, vehicles, …), what each is worth today
            // (repricing journals a valuation), the service log, and disposal
            // state. Writes to Postgres so `/workspace/inventory` and material
            // net worth update. It cannot upload new files (no byte-upload
            // path from chat) but can rename / pin / detach existing ones. See
            // `docs/features/workspace-inventory.md`.
            delegateToInventory: toolDelegateToInventory({
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
