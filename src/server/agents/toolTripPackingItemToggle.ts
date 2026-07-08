import { tool } from 'ai';
import { z } from 'zod';
import { tripPackingItemToggle } from '../commands/tripPackingItemToggle';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { TravelAgentMutationLog } from './agentPersonalAssistantTravel';
import { requireAdminUserId } from './requireAdminUserId';

const tripPackingItemToggleInputSchema = z.object({
    tripPackingItemId: z.uuid().describe('Packing item row id whose `packed` flag to flip.'),
});

interface TravelAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: TravelAgentMutationLog;
}

export function toolTripPackingItemToggle({ serverRuntime, session, mutations }: TravelAgentMutationContext) {
    return tool({
        description: 'Flip `packed` on one packing item — the "mark X as packed / unpacked" shortcut.',
        inputSchema: tripPackingItemToggleInputSchema,
        execute: async (input) => {
            const result = await tripPackingItemToggle(
                requireAdminUserId(session),
                { tripPackingItemId: input.tripPackingItemId },
                session,
                serverRuntime,
            );
            mutations.push({ kind: 'tripPackingItemToggle', id: result.tripPackingItemId, title: result.label });
            return result;
        },
    });
}
