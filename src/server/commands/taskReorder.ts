import { eq } from 'drizzle-orm';
import { tasks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationTaskReorderArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Bulk-rewrites `position` on every task in `orderedIds`, in array order.
// The caller scopes the list to a single `(projectId, status)` bucket
// (one task column on the board, or the standalone-todos list) — the
// server does not enforce bucket membership but mixing them across one
// call is meaningless.
export async function taskReorder(
    args: GqlSAdminMutationTaskReorderArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        await serverRuntime.db.transaction(async (transaction) => {
            for (let position = 0; position < args.orderedIds.length; position++) {
                const taskId = args.orderedIds[position]!;
                await transaction.update(tasks).set({ position, updatedAt: new Date() }).where(eq(tasks.taskId, taskId));
            }
        });
        return { success: true, referenceId: null };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
