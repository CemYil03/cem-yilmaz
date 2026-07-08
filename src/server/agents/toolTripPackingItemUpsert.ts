import { tool } from 'ai';
import { z } from 'zod';
import { tripPackingItemUpsert } from '../commands/tripPackingItemUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { TravelAgentMutationLog } from './agentPersonalAssistantTravel';
import { requireAdminUserId } from './requireAdminUserId';

const tripPackingItemUpsertInputSchema = z.object({
    tripPackingItemId: z.uuid().nullish().describe('Omit to create. Pass an existing id to edit.'),
    tripId: z.uuid().describe('Trip this packing item belongs to.'),
    category: z
        .string()
        .min(1)
        .max(100)
        .describe('Free-text bucket the UI groups by. Common values: Documents, Electronics, Clothing, Toiletries, Medication, Misc.'),
    label: z.string().min(1).max(200).describe('What the item is ("Passport", "Laptop charger").'),
    quantity: z.number().int().min(1).max(9999).nullish().describe('Defaults to 1.'),
    packed: z.boolean().nullish().describe('True if Cem has already packed it. Defaults to false.'),
    position: z.number().int().min(0).nullish().describe('Order within the category. Omit to append at the end.'),
    notes: z.string().max(2000).nullish(),
});

interface TravelAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: TravelAgentMutationLog;
}

export function toolTripPackingItemUpsert({ serverRuntime, session, mutations }: TravelAgentMutationContext) {
    return tool({
        description: 'Create or edit one packing-list item for a trip. For "mark X as packed" use `tripPackingItemToggle` instead.',
        inputSchema: tripPackingItemUpsertInputSchema,
        execute: async (input) => {
            const result = await tripPackingItemUpsert(
                requireAdminUserId(session),
                {
                    input: {
                        tripPackingItemId: input.tripPackingItemId ?? null,
                        tripId: input.tripId,
                        category: input.category,
                        label: input.label,
                        quantity: input.quantity ?? null,
                        packed: input.packed ?? null,
                        position: input.position ?? null,
                        notes: input.notes ?? null,
                    },
                },
                session,
                serverRuntime,
            );
            mutations.push({
                kind: input.tripPackingItemId ? 'tripPackingItemUpdate' : 'tripPackingItemAdd',
                id: result.tripPackingItemId,
                title: result.label,
            });
            return result;
        },
    });
}
