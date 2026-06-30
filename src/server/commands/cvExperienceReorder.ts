import { eq } from 'drizzle-orm';
import { cvExperience } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationCvExperienceReorderArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Bulk-rewrites `position` on every row in `orderedIds`, in array order. The
// caller is the admin editor's drag-reorder handler, which fires the full
// id array after every reorder. Wrapped in a transaction so a partial write
// can't leave the list with duplicate positions.
export async function cvExperienceReorder(
    userId: string,
    args: GqlSAdminMutationCvExperienceReorderArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        await serverRuntime.db.transaction(async (transaction) => {
            for (let position = 0; position < args.orderedIds.length; position++) {
                const cvExperienceId = args.orderedIds[position]!;
                await transaction
                    .update(cvExperience)
                    .set({ position, updatedAt: new Date() })
                    .where(eq(cvExperience.cvExperienceId, cvExperienceId));
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
