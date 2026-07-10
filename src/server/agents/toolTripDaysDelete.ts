import { tool } from 'ai';
import { z } from 'zod';
import { adminTravelTripDaysDelete } from '../commands/adminTravelTripDaysDelete';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { TravelAgentMutationLog } from './agentPersonalAssistantTravel';
import { requireAdminUserId } from './requireAdminUserId';

const tripDaysDeleteInputSchema = z.object({
    tripDayIds: z.array(z.uuid()).min(1).describe('Trip-day row ids to delete. Cascade removes the activities on those days.'),
});

interface TravelAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: TravelAgentMutationLog;
}

export function toolTripDaysDelete({ serverRuntime, session, mutations }: TravelAgentMutationContext) {
    return tool({
        description: 'Delete one or more days of a trip. Activities on those days cascade.',
        inputSchema: tripDaysDeleteInputSchema,
        execute: async (input) => {
            const result = await adminTravelTripDaysDelete(requireAdminUserId(session), input.tripDayIds, session, serverRuntime);
            for (const tripDayId of input.tripDayIds) mutations.push({ kind: 'tripDayDelete', id: tripDayId });
            return result;
        },
    });
}
