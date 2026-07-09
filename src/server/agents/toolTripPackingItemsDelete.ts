import { tool } from 'ai';
import { z } from 'zod';
import { tripPackingItemsDelete } from '../commands/tripPackingItemsDelete';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { TravelAgentMutationLog } from './agentPersonalAssistantTravel';
import { requireAdminUserId } from './requireAdminUserId';

const tripPackingItemsDeleteInputSchema = z.object({
    tripPackingItemIds: z.array(z.uuid()).min(1).describe('Packing-item row ids to delete.'),
});

interface TravelAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: TravelAgentMutationLog;
}

export function toolTripPackingItemsDelete({ serverRuntime, session, mutations }: TravelAgentMutationContext) {
    return tool({
        description: 'Delete one or more packing-list items from a trip.',
        inputSchema: tripPackingItemsDeleteInputSchema,
        execute: async (input) => {
            const result = await tripPackingItemsDelete(requireAdminUserId(session), input.tripPackingItemIds, session, serverRuntime);
            for (const id of input.tripPackingItemIds) mutations.push({ kind: 'tripPackingItemDelete', id });
            return result;
        },
    });
}
