import { eq } from 'drizzle-orm';
import { tasks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationTaskDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

export async function taskDelete(
    args: GqlSAdminMutationTaskDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db.delete(tasks).where(eq(tasks.taskId, args.taskId)).returning({ taskId: tasks.taskId });
        if (deleted.length === 0) {
            throw new Error(`taskDelete: row ${args.taskId} not found`);
        }
        return { success: true, referenceId: null };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
