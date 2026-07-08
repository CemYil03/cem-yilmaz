import { tool } from 'ai';
import { tripDayUpsert } from '../commands/tripDayUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSTripDayInputSchema } from '../graphql/generated';
import type { GqlSSession, GqlSTripDayInput } from '../graphql/generated';
import type { TravelAgentMutationLog } from './agentPersonalAssistantTravel';
import { requireAdminUserId } from './requireAdminUserId';

interface TravelAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: TravelAgentMutationLog;
}

// The `rawInput as GqlSTripDayInput` cast recovers TS inference from the
// generated `Properties<T>` phantom — see `toolTripUpsert.ts` for the full
// explainer. The runtime schema still validates against the type.
export function toolTripDayUpsert({ serverRuntime, session, mutations }: TravelAgentMutationContext) {
    return tool({
        description: 'Create or edit one day within a trip. Days are the buckets activities live under.',
        inputSchema: GqlSTripDayInputSchema(),
        execute: async (rawInput) => {
            const input = rawInput as GqlSTripDayInput;
            const result = await tripDayUpsert(requireAdminUserId(session), input, session, serverRuntime);
            mutations.push({
                kind: input.tripDayId ? 'tripDayUpdate' : 'tripDayAdd',
                id: result.tripDayId,
                title: result.title ?? `Day ${result.dayNumber}`,
            });
            return result;
        },
    });
}
