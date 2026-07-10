import { tool } from 'ai';
import { z } from 'zod';
import { adminInventoryItemsDelete } from '../commands/adminInventoryItemsDelete';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { InventoryAgentMutationLog } from './agentPersonalAssistantInventory';
import { requireAdminUserId } from './requireAdminUserId';

const toolInventoryItemsDeleteInputSchema = z.object({
    itemIds: z
        .array(z.uuid())
        .min(1)
        .describe('AdminInventoryItem row ids to permanently delete (also removes their valuations, service log, and file links).'),
});

interface InventoryAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: InventoryAgentMutationLog;
}

export function toolInventoryItemsDelete({ serverRuntime, session, mutations }: InventoryAgentMutationContext) {
    return tool({
        description: [
            'Permanently delete one or more items along with their valuation history, service log, and file links.',
            'Use only when Cem explicitly says to delete / remove an item for good. If he sold / gave away / lost the',
            'item but wants the history kept, prefer setting `disposalState` via `inventoryItemsUpsert` instead — that',
            'keeps the row so material net worth stays reconcilable.',
        ].join(' '),
        inputSchema: toolInventoryItemsDeleteInputSchema,
        execute: async (input) => {
            const result = await adminInventoryItemsDelete(requireAdminUserId(session), input.itemIds, session, serverRuntime);
            for (const itemId of input.itemIds) mutations.push({ kind: 'itemDelete', id: itemId });
            return result;
        },
    });
}
