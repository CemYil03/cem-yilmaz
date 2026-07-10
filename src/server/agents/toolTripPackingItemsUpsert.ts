import { tool } from 'ai';
import { z } from 'zod';
import { adminTravelTripPackingItemsUpsert } from '../commands/adminTravelTripPackingItemsUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminTravelTripPackingItemInputSchema } from '../graphql/generated';
import type { GqlSAdminTravelTripPackingItemInput, GqlSSession } from '../graphql/generated';
import type { TravelAgentMutationLog } from './agentPersonalAssistantTravel';
import { requireAdminUserId } from './requireAdminUserId';

const toolTripPackingItemsUpsertInputSchema = z.object({
    tripPackingItems: z.array(GqlSAdminTravelTripPackingItemInputSchema()).min(1),
});

interface TravelAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: TravelAgentMutationLog;
}

export function toolTripPackingItemsUpsert({ serverRuntime, session, mutations }: TravelAgentMutationContext) {
    return tool({
        description: [
            'Batch create-or-edit of packing-list items for a trip. Every row with a `tripPackingItemId` is',
            'updated; every row without one is inserted. Also the "mark X as packed / unpacked" surface — pass',
            'the existing row plus `packed: true|false` in a one-element array.',
        ].join(' '),
        inputSchema: toolTripPackingItemsUpsertInputSchema,
        execute: async (rawInput) => {
            const inputs = rawInput.tripPackingItems as GqlSAdminTravelTripPackingItemInput[];
            const result = await adminTravelTripPackingItemsUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
            const referenceIds = result.referenceIds ?? [];
            inputs.forEach((item, index) => {
                mutations.push({
                    kind: item.tripPackingItemId ? 'tripPackingItemUpdate' : 'tripPackingItemAdd',
                    id: referenceIds[index] ?? item.tripPackingItemId ?? '',
                    title: item.label,
                });
            });
            return result;
        },
    });
}
