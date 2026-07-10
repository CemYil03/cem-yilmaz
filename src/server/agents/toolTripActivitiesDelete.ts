import { tool } from 'ai';
import { z } from 'zod';
import { adminTravelTripActivitiesDelete } from '../commands/adminTravelTripActivitiesDelete';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { TravelAgentMutationLog } from './agentPersonalAssistantTravel';
import { requireAdminUserId } from './requireAdminUserId';

const tripActivitiesDeleteInputSchema = z.object({
    tripActivityIds: z.array(z.uuid()).min(1).describe('Activity row ids to delete.'),
});

interface TravelAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: TravelAgentMutationLog;
}

export function toolTripActivitiesDelete({ serverRuntime, session, mutations }: TravelAgentMutationContext) {
    return tool({
        description: 'Delete one or more activities across trip days.',
        inputSchema: tripActivitiesDeleteInputSchema,
        execute: async (input) => {
            const result = await adminTravelTripActivitiesDelete(
                requireAdminUserId(session),
                input.tripActivityIds,
                session,
                serverRuntime,
            );
            for (const tripActivityId of input.tripActivityIds) mutations.push({ kind: 'tripActivityDelete', id: tripActivityId });
            return result;
        },
    });
}
