import { eq } from 'drizzle-orm';
import { tripActivities } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

export interface TripActivityDeleteInput {
    tripActivityId: string;
}

export async function tripActivityDelete(
    userId: string,
    input: TripActivityDeleteInput,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(tripActivities)
            .where(eq(tripActivities.tripActivityId, input.tripActivityId))
            .returning({ tripActivityId: tripActivities.tripActivityId });
        if (deleted.length === 0) throw new Error(`tripActivityDelete: row ${input.tripActivityId} not found`);
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
