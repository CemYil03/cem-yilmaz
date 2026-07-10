import { inArray } from 'drizzle-orm';
import { tripActivities } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch delete of trip activities.
export async function adminTravelTripActivitiesDelete(
    userId: string,
    tripActivityIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(tripActivities)
            .where(inArray(tripActivities.tripActivityId, tripActivityIds as string[]))
            .returning({ tripActivityId: tripActivities.tripActivityId });
        if (deleted.length !== tripActivityIds.length) {
            const found = new Set(deleted.map((row) => row.tripActivityId));
            const missing = tripActivityIds.filter((id) => !found.has(id));
            throw new Error(`adminTravelTripActivitiesDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...tripActivityIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
