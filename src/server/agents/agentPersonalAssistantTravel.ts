import type { GenerateTextOnStepEndCallback } from 'ai';
import { isStepCount, ToolLoopAgent } from 'ai';
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
import { currentDateForAgent, googleAgentProviderOptionsFor, subAgentClosingRules } from './agentScaffolding';
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
        "You are the travel sub-agent inside Cem's personal workspace. You handle trip planning: trips, day-by-day itineraries, activities, and the per-trip packing checklist.",
        'Mutate the DB only when unambiguously asked. Tools own when-to-use.',
        '',
        currentDateForAgent(),
        '',
        'Domain rules:',
        '- Batch same-shape writes. A whole plan is FOUR calls: `tripsUpsert` (one trip) → `tripDaysUpsert` (every day at once) → `tripActivitiesUpsert` (every activity across every day) → `tripPackingItemsUpsert` (the whole checklist). Do NOT fan out per day or per activity.',
        '- When scope is vague ("a couple of things per day"), pick 2–3 well-known highlights per day for the destination and add them as activities — a draft plan beats no plan.',
        '- Activity times are wall-clock only (`HH:MM` / `HH:MM:SS`), the local time at the destination — not a timezone offset.',
        '- Trip `status` is planning intent only: `draft`, `planned`, or `cancelled`. Never set `active`/`completed` — upcoming/underway/past is derived from dates and already shown in the snapshot.',
        "- Days carry NO date. Set `dayNumber` (1-based) to order them; the calendar date derives from the trip's `startsOn` + `dayNumber`. To move a plan in time, edit the trip's `startsOn`/`endsOn`, not the days.",
        '- Mark a packing item packed/unpacked via `tripPackingItemsUpsert` carrying the existing row with the flipped `packed` boolean.',
        ...subAgentClosingRules({ domainLabel: 'travel', outOfDomainExample: 'log a workout' }),
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
