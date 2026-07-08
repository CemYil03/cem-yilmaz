import { eq } from 'drizzle-orm';
import { tripPackingItems } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

export interface TripPackingItemDeleteInput {
    tripPackingItemId: string;
}

export async function tripPackingItemDelete(
    userId: string,
    input: TripPackingItemDeleteInput,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(tripPackingItems)
            .where(eq(tripPackingItems.tripPackingItemId, input.tripPackingItemId))
            .returning({ tripPackingItemId: tripPackingItems.tripPackingItemId });
        if (deleted.length === 0) throw new Error(`tripPackingItemDelete: row ${input.tripPackingItemId} not found`);
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
