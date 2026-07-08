import { tool } from 'ai';
import { z } from 'zod';
import { tripDelete } from '../commands/tripDelete';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { TravelAgentMutationLog } from './agentPersonalAssistantTravel';
import { requireAdminUserId } from './requireAdminUserId';

const tripDeleteInputSchema = z.object({
    tripId: z.uuid().describe('Trip row id to delete. FK cascade removes days, activities, and packing items.'),
});

interface TravelAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: TravelAgentMutationLog;
}

export function toolTripDelete({ serverRuntime, session, mutations }: TravelAgentMutationContext) {
    return tool({
        description: 'Permanently delete a trip and everything under it. Use only when Cem explicitly says to delete.',
        inputSchema: tripDeleteInputSchema,
        execute: async (input) => {
            const result = await tripDelete(requireAdminUserId(session), { tripId: input.tripId }, session, serverRuntime);
            mutations.push({ kind: 'tripDelete', id: input.tripId });
            return result;
        },
    });
}
