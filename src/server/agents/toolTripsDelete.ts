import { tool } from 'ai';
import { z } from 'zod';
import { adminTravelTripsDelete } from '../commands/adminTravelTripsDelete';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { TravelAgentMutationLog } from './agentPersonalAssistantTravel';
import { requireAdminUserId } from './requireAdminUserId';

const tripsDeleteInputSchema = z.object({
    tripIds: z
        .array(z.uuid())
        .min(1)
        .describe('Trip row ids to delete. FK cascade removes each trip’s days, activities, and packing items.'),
});

interface TravelAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: TravelAgentMutationLog;
}

export function toolTripsDelete({ serverRuntime, session, mutations }: TravelAgentMutationContext) {
    return tool({
        description: 'Permanently delete one or more trips and everything under them. Use only when Cem explicitly says to delete.',
        inputSchema: tripsDeleteInputSchema,
        execute: async (input) => {
            const result = await adminTravelTripsDelete(requireAdminUserId(session), input.tripIds, session, serverRuntime);
            for (const tripId of input.tripIds) mutations.push({ kind: 'tripDelete', id: tripId });
            return result;
        },
    });
}
