import { tool } from 'ai';
import { inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { tasks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch delete of tasks. `referenceIds` echoes the deleted ids in input
// order — a caller-supplied id that never existed makes the batch throw.
export async function adminProjectTasksDelete(
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
            throw new Error(`adminProjectTasksDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...taskIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

const toolTasksDeleteInputSchema = z.object({
    taskIds: z.array(z.uuid()).min(1).describe('AdminProjectTask ids from `projectsList` or `standaloneTasksList`.'),
});

interface ProjectsAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolTasksDelete({ serverRuntime, session }: ProjectsAgentToolContext) {
    return tool({
        description: [
            'Permanently delete one or more tasks. Use only when the user is unambiguously asking for a delete; for',
            '"done", prefer `tasksUpsert` with `status: \'done\'`.',
        ].join(' '),
        inputSchema: toolTasksDeleteInputSchema,
        execute: async (input) => {
            return adminProjectTasksDelete(requireAdminUserId(session), input.taskIds, session, serverRuntime);
        },
    });
}
