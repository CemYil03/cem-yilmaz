import { hasToolCall, isStepCount, ToolLoopAgent } from 'ai';
import { toolWorkspaceFileCreate, toolWorkspaceFileGet, toolWorkspaceFileUpdate } from '../commands/workspaceFileCreateFromMarkdown';
import { adminChatConfigFindOne } from '../queries/adminChatConfigFindOne';
import { compassSummaryFindOne } from '../queries/compassSummaryFindOne';
import { ADMIN_CHAT_MODEL_FALLBACK_ID, isAdminChatModelId } from './adminChatModels';
import type { AgentChatOptions } from './agentChatOptions';
import { currentDateForAgent, googleAgentProviderOptionsFor } from './agentScaffolding';
import { toolDelegateToFinances } from './toolDelegateToFinances';
import { toolDelegateToFitness } from './toolDelegateToFitness';
import { toolDelegateToInventory } from './toolDelegateToInventory';
import { toolDelegateToMedia } from './toolDelegateToMedia';
import { toolDelegateToMedical } from './toolDelegateToMedical';
import { toolDelegateToNutrition } from './toolDelegateToNutrition';
import { toolDelegateToProjects } from './toolDelegateToProjects';
import { toolDelegateToTax } from './toolDelegateToTax';
import { toolDelegateToTravel } from './toolDelegateToTravel';
import { toolDelegateToWebSearch } from './toolDelegateToWebSearch';
import { toolPromptUserForInput } from './toolPromptUserForInput';

// Personal-assistant agent for `/workspace/assistant`. This is the
// orchestrator in the agent-delegation pattern: it owns the user-facing
// turn but does not directly own most domain tools. AdminProject/task work is
// handed off to `agentPersonalAssistantProjects` via `delegateToProjects`;
// future domains (calendar, notes, fitness, …) follow the same shape. See
// `docs/architecture/agent-delegation.md` and `docs/features/chat-workspace.md`.
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
    'Tools own their when-to-use descriptions — read them and route; do not narrate a domain to yourself, delegate.',
    '`delegateTo*` hands a brief to a domain sub-agent; `promptUserForInput` collects typed values when needed.',
    '',
    'Handling `delegateTo*` results (except web search):',
    '- `completed` — narrate `summary`; deep-link ids it names when useful.',
    '- `needsMoreInfo` — `promptUserForInput` for `missingFields`, then re-delegate with answers enriched into the brief.',
    '- `noOp` — not that domain; reply conversationally or try another tool.',
    '- `failed` — quote `summary` plainly. Do NOT retry automatically, invent softer reasons, or soften the failure.',
    '',
    '`delegateToWebSearch` returns `{ status: completed|partial|failed, results: [{ brief, status, summary }] }`.',
    'Quote/narrate each completed `summary` (inline `[title](url)` links are the citations — no separate Sources block).',
    'On per-entry `failed`, say which brief failed and quote its summary; do not retry automatically.',
    '',
    'Documents: draft durable notes/plans via `workspaceFileCreate` (do not paste the body into chat).',
    'Questions → `workspaceFileGet` then answer in chat. Edits → get then `workspaceFileUpdate`. Prefer plain chat for short replies.',
    '',
    'Style:',
    '- Reply in the language Cem wrote in (German or English).',
    '- Be concise and direct. Skip pleasantries and corporate filler.',
    '- Push back when an instruction looks wrong; ask for clarification when ambiguous.',
    '',
    'Deep-links: when a summary names an id Cem may want to open, format `[label](/workspace/<surface>?…&focus=<id>)`.',
    'Never invent an id. Patterns (use the matching surface from the summary):',
    '- Projects/inbox/tasks → `/workspace/projects?tab=projects|inbox&focus=<id>` or `/workspace/todos?focus=<id>`',
    '- Media → `/workspace/media?tab=movies|series|youtube|podcasts&focus=<id>`',
    '- Medical → `/workspace/medical?tab=records|appointments&focus=<id>`',
    '- Travel / inventory → `/workspace/travel/<tripId>` / `/workspace/inventory/<itemId>`',
    '- Nutrition → `/workspace/nutrition?tab=cookbook|diary&focus=<id>`',
    '- Fitness → `/workspace/fitness?tab=workouts|routines|exercises&focus=<id>`',
    '- Tax → `/workspace/tax?tab=expenses|income|documents&focus=<id>`',
    '- Visitor chat → `/workspace/visitor-chats?chatId=<chatId>`',
    'Example: "Created [Acme rebuild](/workspace/projects?tab=projects&focus=4f2a…) under planning."',
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
    stepArtifact,
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
            // Standalone markdown documents Cem opens and edits in the
            // workspace document panel. Unlike the `delegateTo*` tools these
            // live directly on the orchestrator (no sub-agent hop) — creating a
            // doc is a single write and the result carries the id the chat
            // renders the attachment from. Create / read-latest / overwrite.
            // See `docs/features/workspace-files.md`.
            workspaceFileCreate: toolWorkspaceFileCreate({ serverRuntime, session }),
            workspaceFileGet: toolWorkspaceFileGet({ serverRuntime, session }),
            workspaceFileUpdate: toolWorkspaceFileUpdate({ serverRuntime, session }),
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
                stepArtifact,
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
                stepArtifact,
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
                stepArtifact,
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
                stepArtifact,
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
                stepArtifact,
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
                stepArtifact,
            }),
            // Finances sub-agent — cashflow (income streams + recurring costs)
            // and wealth assets (Tagesgeld / ETF / stock / Bauspar with a
            // location label). Writes to Postgres so `/workspace/finances`
            // updates. See `docs/features/workspace-finances.md`.
            delegateToFinances: toolDelegateToFinances({
                serverRuntime,
                session,
                chatId,
                generationId: assistantOptions.generationId,
                preWrittenToolCallIds,
                stepArtifact,
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
                stepArtifact,
            }),
            // Tax sub-agent — the German tax return: tax years, income sources
            // (one per Anlage), deductible expenses, and the document
            // checklist. Writes to Postgres so `/workspace/tax` updates. It is
            // a documentarian, not a tax advisor — it records and organises but
            // never gives binding Steuerberatung. It cannot upload receipt
            // files (no byte-upload path from chat). See
            // `docs/features/workspace-tax.md`.
            delegateToTax: toolDelegateToTax({
                serverRuntime,
                session,
                chatId,
                generationId: assistantOptions.generationId,
                preWrittenToolCallIds,
                stepArtifact,
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
                stepArtifact,
            }),
        },
    });
}
