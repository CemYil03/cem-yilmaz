import { tool } from 'ai';
import { inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { tripPackingItems } from '../db/schema';
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
            .delete(tripPackingItems)
            .where(inArray(tripPackingItems.tripPackingItemId, tripPackingItemIds as string[]))
            .returning({ tripPackingItemId: tripPackingItems.tripPackingItemId });
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

interface TravelAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolTripPackingItemsDelete({ serverRuntime, session }: TravelAgentToolContext) {
    return tool({
        description: 'Delete one or more packing-list items from a trip.',
        inputSchema: z.object({
            tripPackingItemIds: z.array(z.uuid()).min(1).describe('Packing-item row ids to delete.'),
        }),
        execute: async (input) => {
            return adminTravelTripPackingItemsDelete(requireAdminUserId(session), input.tripPackingItemIds, session, serverRuntime);
        },
    });
}
