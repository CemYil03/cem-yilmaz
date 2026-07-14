import { tool } from 'ai';
import { inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { items } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch delete of items. FK cascades remove each item's valuations, service
// entries, and file joins — the underlying `FileUploads` rows are preserved
// (they belong to the user, not the item). `referenceIds` echoes the deleted
// ids in input order; a caller-supplied id that never existed makes the batch
// throw (same posture as the singular delete had).
export async function adminInventoryItemsDelete(
    userId: string,
    itemIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(items)
            .where(inArray(items.itemId, itemIds as string[]))
            .returning({ itemId: items.itemId });
        if (deleted.length !== itemIds.length) {
            const found = new Set(deleted.map((row) => row.itemId));
            const missing = itemIds.filter((id) => !found.has(id));
            throw new Error(`adminInventoryItemsDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...itemIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

const toolInventoryItemsDeleteInputSchema = z.object({
    itemIds: z
        .array(z.uuid())
        .min(1)
        .describe('AdminInventoryItem row ids to permanently delete (also removes their valuations, service log, and file links).'),
});

interface InventoryAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolInventoryItemsDelete({ serverRuntime, session }: InventoryAgentToolContext) {
    return tool({
        description: [
            'Permanently delete one or more items along with their valuation history, service log, and file links.',
            'Use only when Cem explicitly says to delete / remove an item for good. If he sold / gave away / lost the',
            'item but wants the history kept, prefer setting `disposalState` via `inventoryItemsUpsert` instead — that',
            'keeps the row so material net worth stays reconcilable.',
        ].join(' '),
        inputSchema: toolInventoryItemsDeleteInputSchema,
        execute: async (input) => {
            return adminInventoryItemsDelete(requireAdminUserId(session), input.itemIds, session, serverRuntime);
        },
    });
}
