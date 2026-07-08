import type { GenerateTextOnStepEndCallback } from 'ai';
import { ToolLoopAgent, isStepCount } from 'ai';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { ADMIN_CHAT_MODEL_FALLBACK_ID } from './adminChatModels';
import { currentDateForAgent, googleAgentProviderOptionsFor } from './agentScaffolding';
import { toolTripActivityDelete } from './toolTripActivityDelete';
import { toolTripActivityUpsert } from './toolTripActivityUpsert';
import { toolTripDayDelete } from './toolTripDayDelete';
import { toolTripDayUpsert } from './toolTripDayUpsert';
import { toolTripDelete } from './toolTripDelete';
import { toolTripGet } from './toolTripGet';
import { toolTripPackingItemDelete } from './toolTripPackingItemDelete';
import { toolTripPackingItemToggle } from './toolTripPackingItemToggle';
import { toolTripPackingItemUpsert } from './toolTripPackingItemUpsert';
import { toolTripUpsert } from './toolTripUpsert';
import { toolTripUpsertDeep } from './toolTripUpsertDeep';
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
    | 'tripPackingItemDelete'
    | 'tripPackingItemToggle';

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
        'the DB rather than replaying the conversation.',
        '',
        currentDateForAgent(),
        '',
        'You have these tools:',
        '- `tripsList`, `tripGet` — read full rows when the snapshot below is not enough.',
        '- `tripUpsertDeep` — **preferred for whole-trip planning**: create or edit a trip together with its days,',
        '  activities, and packing items in ONE call. Merge-only nested payloads (omitting a day never deletes it);',
        '  use `removeDayIds` / `removeActivityIds` / `removePackingItemIds` to remove existing rows in the same call.',
        '  Prefer this over chaining `tripUpsert` + several `tripDay*` / `tripActivity*` / `tripPackingItem*` writes.',
        '- `tripUpsert` — create-or-edit ONLY the trip root (title, destination, dates, status, transport, accommodation, notes).',
        '  Use for pure metadata edits with no nested changes.',
        '- `tripDelete` — permanent delete of a trip and its days / activities / packing.',
        '- `tripDayUpsert` — surgical create-or-edit of one day (dayNumber, date, title, summary).',
        '- `tripDayDelete` — remove one day (and its activities via cascade).',
        '- `tripActivityUpsert` — surgical create-or-edit of one activity on a day.',
        '- `tripActivityDelete` — remove one activity.',
        '- `tripPackingItemUpsert` — surgical create-or-edit of one packing item.',
        '- `tripPackingItemDelete` — remove one packing item.',
        '- `tripPackingItemToggle` — flip `packed` on one packing item; use this for "mark X as packed / unpacked".',
        '',
        'Rules:',
        '- Reply in the language the user wrote in (German or English).',
        '- Be concise: your final text becomes the orchestrator narration to Cem. One or two sentences summarizing',
        '  what you did.',
        '- Never invent an id. Use ids from the snapshot below or from a tool result earlier in this turn.',
        '- Planning a new trip from dates: use ONE `tripUpsertDeep` call carrying the trip root, one nested `day` per',
        '  calendar day (dayNumber 1..N with the matching `date`) and their activities inline, plus any packing items.',
        '  The whole plan lands in a single transaction — the point is that the plan lives in the DB when the turn ends.',
        '  Reserve the granular `tripDay*` / `tripActivity*` / `tripPackingItem*` tools for one-off surgical edits.',
        '- When Cem gives vague scope ("a couple of things per day"), pick 2–3 well-known highlights per day for the',
        '  destination and add them as activities. Do NOT block on asking for every detail — a draft plan is more',
        '  useful than no plan.',
        '- Only ask for clarification when a required field is genuinely missing (no destination, no dates for a new',
        '  trip, no title for an activity you cannot infer, ambiguous which trip Cem means when several exist). In',
        '  those cases return EXACTLY this JSON as your final text, nothing else:',
        '  {"status":"needsMoreInfo","missingFields":["..."],"summary":"..."}',
        "- If the request asks for something outside travel (e.g. 'log a workout'), return the same JSON with status",
        '  `noOp` and an empty `missingFields` array.',
        '- Times on activities are wall-clock only (`HH:MM` or `HH:MM:SS` strings). Use the local time at the',
        '  destination as Cem would say it, not a timezone offset.',
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
        // Ten-step ceiling matches the media / projects sub-agents. A trip
        // plan is typically: `tripUpsert` + N `tripDayUpsert` + N or more
        // `tripActivityUpsert` + final text. Ten steps covers a 3-day plan
        // with two activities per day; anything longer can be a follow-up
        // delegation.
        stopWhen: [isStepCount(10)],
        instructions: buildSystemPrompt(snapshot),
        tools: {
            tripsList: toolTripsList(readContext),
            tripGet: toolTripGet(readContext),
            tripUpsertDeep: toolTripUpsertDeep(mutationContext),
            tripUpsert: toolTripUpsert(mutationContext),
            tripDelete: toolTripDelete(mutationContext),
            tripDayUpsert: toolTripDayUpsert(mutationContext),
            tripDayDelete: toolTripDayDelete(mutationContext),
            tripActivityUpsert: toolTripActivityUpsert(mutationContext),
            tripActivityDelete: toolTripActivityDelete(mutationContext),
            tripPackingItemUpsert: toolTripPackingItemUpsert(mutationContext),
            tripPackingItemDelete: toolTripPackingItemDelete(mutationContext),
            tripPackingItemToggle: toolTripPackingItemToggle(mutationContext),
        },
    });
}
