import type { GenerateTextOnStepEndCallback } from 'ai';
import { ToolLoopAgent, isStepCount } from 'ai';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { ADMIN_CHAT_MODEL_FALLBACK_ID } from './adminChatModels';
import { currentDateForAgent, googleAgentProviderOptionsFor } from './agentScaffolding';
import { toolTripActivitiesDelete } from './toolTripActivitiesDelete';
import { toolTripActivitiesUpsert } from './toolTripActivitiesUpsert';
import { toolTripDaysDelete } from './toolTripDaysDelete';
import { toolTripDaysUpsert } from './toolTripDaysUpsert';
import { toolTripGet } from './toolTripGet';
import { toolTripPackingItemsDelete } from './toolTripPackingItemsDelete';
import { toolTripPackingItemsUpsert } from './toolTripPackingItemsUpsert';
import { toolTripsDelete } from './toolTripsDelete';
import { toolTripsUpsert } from './toolTripsUpsert';
import { toolTripsList } from './toolTripsList';
import { travelSnapshotForAgent } from './travelSnapshotForAgent';

// Travel domain sub-agent under the orchestrator pattern documented in
// `docs/architecture/agent-delegation.md`. Runs in-process inside
// `toolDelegateToTravel`'s `execute`, receives an `onStepEnd` from the
// delegate tool, and returns a final text (or `needsMoreInfo` / `noOp` JSON
// sentinel) plus a structured `mutations` log.
//
// The whole point of this agent is durable trip planning: it persists the
// day-by-day itinerary and packing list to Postgres so a fresh chat session
// can read the plan back without re-running the conversation.
//
// Every write tool is a batch. A full plan is `tripsUpsert` (1 trip) →
// `tripDaysUpsert` (N days) → `tripActivitiesUpsert` (M activities across
// all days) → `tripPackingItemsUpsert` (K items) — four tool calls total,
// safely under `isStepCount(10)`.

type TravelAgentMutationKind =
    | 'tripAdd'
    | 'tripUpdate'
    | 'tripDelete'
    | 'tripDayAdd'
    | 'tripDayUpdate'
    | 'tripDayDelete'
    | 'tripActivityAdd'
    | 'tripActivityUpdate'
    | 'tripActivityDelete'
    | 'tripPackingItemAdd'
    | 'tripPackingItemUpdate'
    | 'tripPackingItemDelete';

export interface TravelAgentMutation {
    kind: TravelAgentMutationKind;
    // Trip / day / activity / packing-item id depending on `kind`.
    id: string;
    // Best-effort label for the orchestrator's user-facing narration.
    title?: string;
}

export type TravelAgentMutationLog = TravelAgentMutation[];

export interface TravelAgentOptions {
    session: GqlSSession;
    serverRuntime: ServerRuntime;
    mutations: TravelAgentMutationLog;
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
        '  what you did.',
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

export async function agentPersonalAssistantTravel({ session, serverRuntime, mutations, onStepEnd }: TravelAgentOptions) {
    const snapshot = await travelSnapshotForAgent(serverRuntime);
    const readContext = { serverRuntime, session };
    const mutationContext = { serverRuntime, session, mutations };
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
            tripsList: toolTripsList(readContext),
            tripGet: toolTripGet(readContext),
            tripsUpsert: toolTripsUpsert(mutationContext),
            tripsDelete: toolTripsDelete(mutationContext),
            tripDaysUpsert: toolTripDaysUpsert(mutationContext),
            tripDaysDelete: toolTripDaysDelete(mutationContext),
            tripActivitiesUpsert: toolTripActivitiesUpsert(mutationContext),
            tripActivitiesDelete: toolTripActivitiesDelete(mutationContext),
            tripPackingItemsUpsert: toolTripPackingItemsUpsert(mutationContext),
            tripPackingItemsDelete: toolTripPackingItemsDelete(mutationContext),
        },
    });
}
