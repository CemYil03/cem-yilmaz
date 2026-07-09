import { inArray } from 'drizzle-orm';
import { tripDays } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch delete of trip days. FK cascade removes each day's activities.
export async function tripDaysDelete(
    userId: string,
    tripDayIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(tripDays)
            .where(inArray(tripDays.tripDayId, tripDayIds as string[]))
            .returning({ tripDayId: tripDays.tripDayId });
        if (deleted.length !== tripDayIds.length) {
            const found = new Set(deleted.map((row) => row.tripDayId));
            const missing = tripDayIds.filter((id) => !found.has(id));
            throw new Error(`tripDaysDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...tripDayIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
