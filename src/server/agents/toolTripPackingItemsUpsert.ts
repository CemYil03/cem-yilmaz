import { tool } from 'ai';
import { z } from 'zod';
import { tripPackingItemsUpsert } from '../commands/tripPackingItemsUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSTripPackingItemInputSchema } from '../graphql/generated';
import type { GqlSSession, GqlSTripPackingItemInput } from '../graphql/generated';
import type { TravelAgentMutationLog } from './agentPersonalAssistantTravel';
import { requireAdminUserId } from './requireAdminUserId';

const toolTripPackingItemsUpsertInputSchema = z.object({
    tripPackingItems: z.array(GqlSTripPackingItemInputSchema()).min(1),
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
            const inputs = rawInput.tripPackingItems as GqlSTripPackingItemInput[];
            const result = await tripPackingItemsUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
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
