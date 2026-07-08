import { eq } from 'drizzle-orm';
import { trips } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Delete a trip. FK cascades remove the trip's days, activities, and
// packing items in one shot.
export interface TripDeleteInput {
    tripId: string;
}

export async function tripDelete(
    userId: string,
    input: TripDeleteInput,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db.delete(trips).where(eq(trips.tripId, input.tripId)).returning({ tripId: trips.tripId });
        if (deleted.length === 0) throw new Error(`tripDelete: row ${input.tripId} not found`);
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
