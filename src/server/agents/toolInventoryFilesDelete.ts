import { tool } from 'ai';
import { z } from 'zod';
import { adminInventoryItemFilesDelete } from '../commands/adminInventoryItemFilesDelete';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { InventoryAgentMutationLog } from './agentPersonalAssistantInventory';
import { requireAdminUserId } from './requireAdminUserId';

// Detach files from an item. Deletes the join rows only — the underlying
// uploads belong to the user and are preserved.
const toolInventoryFilesDeleteInputSchema = z.object({
    itemFileIds: z
        .array(z.uuid())
        .min(1)
        .describe('AdminInventoryItem-file row ids to detach. Removes the link only; the uploaded file itself is kept.'),
});

interface InventoryAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: InventoryAgentMutationLog;
}

export function toolInventoryFilesDelete({ serverRuntime, session, mutations }: InventoryAgentMutationContext) {
    return tool({
        description: [
            'Detach one or more files from an item — removes the link between the item and the uploaded file. The',
            'upload itself is preserved (it belongs to Cem). Use when he wants a receipt / manual / photo removed from',
            'an item.',
        ].join(' '),
        inputSchema: toolInventoryFilesDeleteInputSchema,
        execute: async (input) => {
            const result = await adminInventoryItemFilesDelete(requireAdminUserId(session), input.itemFileIds, session, serverRuntime);
            for (const itemFileId of input.itemFileIds) mutations.push({ kind: 'fileDelete', id: itemFileId });
            return result;
        },
    });
}
