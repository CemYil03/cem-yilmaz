import { inArray } from 'drizzle-orm';
import { adminTravelTripDays } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch delete of trip days. FK cascade removes each day's activities.
export async function adminTravelTripDaysDelete(
    userId: string,
    tripDayIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(adminTravelTripDays)
            .where(inArray(adminTravelTripDays.tripDayId, tripDayIds as string[]))
            .returning({ tripDayId: adminTravelTripDays.tripDayId });
        if (deleted.length !== tripDayIds.length) {
            const found = new Set(deleted.map((row) => row.tripDayId));
            const missing = tripDayIds.filter((id) => !found.has(id));
            throw new Error(`adminTravelTripDaysDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...tripDayIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
