import { inArray } from 'drizzle-orm';
import { projectActivities } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch permanent delete of activity rows. The timeline has no soft-delete
// today — Cem prefers a clean stream, and the row is cheap to retype if
// removed in error. `referenceIds` echoes the deleted ids in input order — a
// caller-supplied id that never existed makes the batch throw.
export async function adminProjectActivitiesDelete(
    userId: string,
    activityIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(projectActivities)
            .where(inArray(projectActivities.activityId, activityIds as string[]))
            .returning({ activityId: projectActivities.activityId });
        if (deleted.length !== activityIds.length) {
            const found = new Set(deleted.map((row) => row.activityId));
            const missing = activityIds.filter((id) => !found.has(id));
            throw new Error(`adminProjectActivitiesDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...activityIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
