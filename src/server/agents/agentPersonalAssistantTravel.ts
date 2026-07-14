import type { GenerateTextOnStepEndCallback } from 'ai';
import { ToolLoopAgent, isStepCount } from 'ai';
import { toolAdminTravelTripActivitiesDelete } from '../commands/adminTravelTripActivitiesDelete';
import { toolTripActivitiesUpsert } from '../commands/adminTravelTripActivitiesUpsert';
import { toolTripDaysDelete } from '../commands/adminTravelTripDaysDelete';
import { toolTripDaysUpsert } from '../commands/adminTravelTripDaysUpsert';
import { toolTripPackingItemsDelete } from '../commands/adminTravelTripPackingItemsDelete';
import { toolTripPackingItemsUpsert } from '../commands/adminTravelTripPackingItemsUpsert';
import { toolTripsDelete } from '../commands/adminTravelTripsDelete';
import { toolTripsUpsert } from '../commands/adminTravelTripsUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { ADMIN_CHAT_MODEL_FALLBACK_ID } from './adminChatModels';
import { currentDateForAgent, googleAgentProviderOptionsFor } from './agentScaffolding';
import { toolTripGet } from './toolTripGet';
import { toolTripsList } from './toolTripsList';
import { travelSnapshotForAgent } from './travelSnapshotForAgent';

// Travel domain sub-agent under the orchestrator pattern documented in
// `docs/architecture/agent-delegation.md`. Runs in-process inside
// `toolDelegateToTravel`'s `execute`, receives an `onStepEnd` from the
// delegate tool, and returns a final text (or `needsMoreInfo` / `noOp` JSON
// sentinel). When it creates or changes a row Cem may want to open, it names
// that row's id in its final summary so the orchestrator can deep-link it.
//
// The whole point of this agent is durable trip planning: it persists the
// day-by-day itinerary and packing list to Postgres so a fresh chat session
// can read the plan back without re-running the conversation.
//
// Every write tool is a batch. A full plan is `tripsUpsert` (1 trip) →
// `tripDaysUpsert` (N days) → `tripActivitiesUpsert` (M activities across
// all days) → `tripPackingItemsUpsert` (K items) — four tool calls total,
// safely under `isStepCount(10)`.

export interface TravelAgentOptions {
    session: GqlSSession;
    serverRuntime: ServerRuntime;
    onStepEnd?: GenerateTextOnStepEndCallback<any>;
}

function buildSystemPrompt(snapshot: string): string {
    return [
        "You are the travel sub-agent inside Cem's personal workspace. You handle every ask about trip planning:",
        'creating trips, drafting day-by-day itineraries, adding or editing activities, and managing the per-trip',
        'packing checklist. Your tools mutate the workspace DB — use them any time Cem asks for a plan to be',
        'created, updated, or deleted. Persisting the plan is the entire point: future chats read the trip from',
        'the DB rather than replaying the conversation. Each tool carries its own description of when to reach',
        'for it (batch upsert vs. batch delete, root vs. nested) and how its inputs are shaped; the cross-tool',
        'workflow rules below are all the tool guidance you need beyond those descriptions.',
        '',
        currentDateForAgent(),
        '',
        'Rules:',
        '- Reply in the language the user wrote in (German or English).',
        '- Be concise: your final text becomes the orchestrator narration to Cem. One or two sentences summarizing',
        '  what you did. When you create or change a trip / day / activity / packing item Cem may want to open,',
        '  name its id in your summary so the orchestrator can build a deep-link.',
        '- Never invent an id. Use ids from the snapshot below, from an upsert result’s `referenceIds` earlier',
        '  in this turn (in input order), or omit the id entirely to insert a new row.',
        '- Batch every same-shape write together. A whole plan is FOUR tool calls: `tripsUpsert` (one trip),',
        '  `tripDaysUpsert` (every day at once), `tripActivitiesUpsert` (every activity across every day),',
        '  `tripPackingItemsUpsert` (the whole checklist). Do NOT fan out into one call per day or per activity.',
        '- When Cem gives vague scope ("a couple of things per day"), pick 2–3 well-known highlights per day for',
        '  the destination and add them as activities. Do NOT block on asking for every detail — a draft plan is',
        '  more useful than no plan.',
        '- Only ask for clarification when a required field is genuinely missing (no destination, no dates for a',
        '  new trip, no title for an activity you cannot infer, ambiguous which trip Cem means when several',
        '  exist). In those cases return EXACTLY this JSON as your final text, nothing else:',
        '  {"status":"needsMoreInfo","missingFields":["..."],"summary":"..."}',
        "- If the request asks for something outside travel (e.g. 'log a workout'), return the same JSON with",
        '  status `noOp` and an empty `missingFields` array.',
        '- Times on activities are wall-clock only (`HH:MM` or `HH:MM:SS` strings). Use the local time at the',
        '  destination as Cem would say it, not a timezone offset.',
        '- To mark a packing item as packed / unpacked, use `tripPackingItemsUpsert` with a one-element array',
        '  carrying the existing row plus the flipped `packed` boolean.',
        '',
        'Current travel snapshot (refreshed at the start of this turn):',
        '',
        snapshot,
    ].join('\n');
}

export async function agentPersonalAssistantTravel({ session, serverRuntime, onStepEnd }: TravelAgentOptions) {
    const snapshot = await travelSnapshotForAgent(serverRuntime);
    const toolContext = { serverRuntime, session };
    const modelId = ADMIN_CHAT_MODEL_FALLBACK_ID;
    return new ToolLoopAgent({
        model: serverRuntime.ai.userConversationModel(modelId),
        onStepEnd,
        providerOptions: googleAgentProviderOptionsFor(modelId),
        // Ten-step ceiling matches the media / projects sub-agents. A full
        // trip plan now fits in 4 tool calls (`tripsUpsert` →
        // `tripDaysUpsert` → `tripActivitiesUpsert` → `tripPackingItemsUpsert`)
        // — well under the ceiling, leaving headroom for read calls or a
        // follow-up surgical edit in the same turn.
        stopWhen: [isStepCount(10)],
        instructions: buildSystemPrompt(snapshot),
        tools: {
            tripsList: toolTripsList(toolContext),
            tripGet: toolTripGet(toolContext),
            tripsUpsert: toolTripsUpsert(toolContext),
            tripsDelete: toolTripsDelete(toolContext),
            tripDaysUpsert: toolTripDaysUpsert(toolContext),
            tripDaysDelete: toolTripDaysDelete(toolContext),
            tripActivitiesUpsert: toolTripActivitiesUpsert(toolContext),
            tripActivitiesDelete: toolAdminTravelTripActivitiesDelete(toolContext),
            tripPackingItemsUpsert: toolTripPackingItemsUpsert(toolContext),
            tripPackingItemsDelete: toolTripPackingItemsDelete(toolContext),
        },
    });
}
