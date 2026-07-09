import { tool } from 'ai';
import { tripActivityUpsert } from '../commands/tripActivityUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSTripActivityInputSchema } from '../graphql/generated';
import type { GqlSSession, GqlSTripActivityInput } from '../graphql/generated';
import type { TravelAgentMutationLog } from './agentPersonalAssistantTravel';
import { requireAdminUserId } from './requireAdminUserId';

interface TravelAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: TravelAgentMutationLog;
}

// The `rawInput as GqlSTripActivityInput` cast recovers TS inference from
// the generated `Properties<T>` phantom — see `toolTripUpsert.ts`. The
// runtime schema still validates against the type.
export function toolTripActivityUpsert({ serverRuntime, session, mutations }: TravelAgentMutationContext) {
    return tool({
        description: [
            'Surgical create-or-edit of ONE activity on a trip day (booking, sightseeing, meal, transfer …).',
            'For a fresh whole-trip plan prefer `tripUpsertDeep` — reserve this tool for one-off edits to an',
            'already planned trip. Times are wall-clock strings `HH:MM` / `HH:MM:SS` in the local time at the',
            'destination — never a timezone offset.',
        ].join(' '),
        inputSchema: GqlSTripActivityInputSchema(),
        execute: async (rawInput) => {
            const input = rawInput as GqlSTripActivityInput;
            const result = await tripActivityUpsert(requireAdminUserId(session), input, session, serverRuntime);
            mutations.push({
                kind: input.tripActivityId ? 'tripActivityUpdate' : 'tripActivityAdd',
                id: result.tripActivityId,
                title: result.title,
            });
            return result;
        },
    });
}
