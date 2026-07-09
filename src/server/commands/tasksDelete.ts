import { inArray } from 'drizzle-orm';
import { tasks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch delete of tasks. `referenceIds` echoes the deleted ids in input
// order — a caller-supplied id that never existed makes the batch throw.
export async function tasksDelete(
    userId: string,
    taskIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(tasks)
            .where(inArray(tasks.taskId, taskIds as string[]))
            .returning({ taskId: tasks.taskId });
        if (deleted.length !== taskIds.length) {
            const found = new Set(deleted.map((row) => row.taskId));
            const missing = taskIds.filter((id) => !found.has(id));
            throw new Error(`tasksDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...taskIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
