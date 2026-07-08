import { eq } from 'drizzle-orm';
import { tripDays } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Delete one day of a trip. FK cascade removes activities on that day.
export interface TripDayDeleteInput {
    tripDayId: string;
}

export async function tripDayDelete(
    userId: string,
    input: TripDayDeleteInput,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(tripDays)
            .where(eq(tripDays.tripDayId, input.tripDayId))
            .returning({ tripDayId: tripDays.tripDayId });
        if (deleted.length === 0) throw new Error(`tripDayDelete: row ${input.tripDayId} not found`);
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
