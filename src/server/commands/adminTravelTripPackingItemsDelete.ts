import { inArray } from 'drizzle-orm';
import { adminTravelTripPackingItems } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch delete of trip packing items.
export async function adminTravelTripPackingItemsDelete(
    userId: string,
    tripPackingItemIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(adminTravelTripPackingItems)
            .where(inArray(adminTravelTripPackingItems.tripPackingItemId, tripPackingItemIds as string[]))
            .returning({ tripPackingItemId: adminTravelTripPackingItems.tripPackingItemId });
        if (deleted.length !== tripPackingItemIds.length) {
            const found = new Set(deleted.map((row) => row.tripPackingItemId));
            const missing = tripPackingItemIds.filter((id) => !found.has(id));
            throw new Error(`adminTravelTripPackingItemsDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...tripPackingItemIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
