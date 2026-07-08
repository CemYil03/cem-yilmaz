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
        description:
            'Create or edit one activity on a trip day (booking, sightseeing, meal, transfer …). Times are wall-clock strings `HH:MM` / `HH:MM:SS`.',
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
