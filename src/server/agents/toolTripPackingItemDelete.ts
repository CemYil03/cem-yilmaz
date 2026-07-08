import { tool } from 'ai';
import { z } from 'zod';
import { tripPackingItemDelete } from '../commands/tripPackingItemDelete';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { TravelAgentMutationLog } from './agentPersonalAssistantTravel';
import { requireAdminUserId } from './requireAdminUserId';

const tripPackingItemDeleteInputSchema = z.object({
    tripPackingItemId: z.uuid().describe('Packing item row id to delete.'),
});

interface TravelAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: TravelAgentMutationLog;
}

export function toolTripPackingItemDelete({ serverRuntime, session, mutations }: TravelAgentMutationContext) {
    return tool({
        description: 'Delete one packing item from a trip.',
        inputSchema: tripPackingItemDeleteInputSchema,
        execute: async (input) => {
            const result = await tripPackingItemDelete(
                requireAdminUserId(session),
                { tripPackingItemId: input.tripPackingItemId },
                session,
                serverRuntime,
            );
            mutations.push({ kind: 'tripPackingItemDelete', id: input.tripPackingItemId });
            return result;
        },
    });
}
