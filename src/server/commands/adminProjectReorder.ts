import { eq } from 'drizzle-orm';
import { projects } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationAdminProjectReorderArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Bulk-rewrites `position` on every project in `orderedIds`, in array order.
// The board reorders within a single status column at a time; the caller
// concatenates every column's order into one id list, same shape as the
// CV skill reorder. Transactioned so a partial write can't leave duplicate
// positions inside a column.
export async function adminProjectReorder(
    userId: string,
    args: GqlSAdminMutationAdminProjectReorderArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        await serverRuntime.db.transaction(async (transaction) => {
            for (let position = 0; position < args.orderedIds.length; position++) {
                const projectId = args.orderedIds[position]!;
                await transaction.update(projects).set({ position, updatedAt: new Date() }).where(eq(projects.projectId, projectId));
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
