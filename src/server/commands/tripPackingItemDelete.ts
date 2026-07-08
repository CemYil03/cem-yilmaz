import { eq } from 'drizzle-orm';
import { tripPackingItems } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationTripPackingItemDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

export async function tripPackingItemDelete(
    userId: string,
    args: GqlSAdminMutationTripPackingItemDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(tripPackingItems)
            .where(eq(tripPackingItems.tripPackingItemId, args.tripPackingItemId))
            .returning({ tripPackingItemId: tripPackingItems.tripPackingItemId });
        if (deleted.length === 0) throw new Error(`tripPackingItemDelete: row ${args.tripPackingItemId} not found`);
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
