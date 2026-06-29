import { eq } from 'drizzle-orm';
import { projectActivities } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationProjectActivityDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Permanent delete of one activity row. The timeline has no soft-delete
// today — Cem prefers a clean stream, and the row is cheap to retype if
// removed in error.
export async function projectActivityDelete(
    args: GqlSAdminMutationProjectActivityDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(projectActivities)
            .where(eq(projectActivities.activityId, args.activityId))
            .returning({ activityId: projectActivities.activityId });
        if (deleted.length === 0) {
            throw new Error(`projectActivityDelete: row ${args.activityId} not found`);
        }
        return { success: true, referenceId: null };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
