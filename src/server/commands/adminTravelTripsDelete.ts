import { inArray } from 'drizzle-orm';
import { adminTravelTrips } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch delete of trips. FK cascades remove each trip's days, activities,
// and packing items. `referenceIds` echoes the deleted ids in input order —
// a caller-supplied id that never existed makes the batch throw (same
// posture as the singular delete had).
export async function adminTravelTripsDelete(
    userId: string,
    tripIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(adminTravelTrips)
            .where(inArray(adminTravelTrips.tripId, tripIds as string[]))
            .returning({ tripId: adminTravelTrips.tripId });
        if (deleted.length !== tripIds.length) {
            const found = new Set(deleted.map((row) => row.tripId));
            const missing = tripIds.filter((id) => !found.has(id));
            throw new Error(`adminTravelTripsDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...tripIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
