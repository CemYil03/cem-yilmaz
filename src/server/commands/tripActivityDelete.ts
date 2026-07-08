import { eq } from 'drizzle-orm';
import { tripActivities } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationTripActivityDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

export async function tripActivityDelete(
    userId: string,
    args: GqlSAdminMutationTripActivityDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(tripActivities)
            .where(eq(tripActivities.tripActivityId, args.tripActivityId))
            .returning({ tripActivityId: tripActivities.tripActivityId });
        if (deleted.length === 0) throw new Error(`tripActivityDelete: row ${args.tripActivityId} not found`);
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
