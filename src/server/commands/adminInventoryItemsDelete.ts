import { inArray } from 'drizzle-orm';
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
