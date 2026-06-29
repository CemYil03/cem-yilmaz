import { eq } from 'drizzle-orm';
import { projects } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationProjectDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Deletes a project. The `Tasks.projectId` FK is `ON DELETE CASCADE`, so
// every project-bound task is wiped along with it. Standalone todos
// (projectId IS NULL) are untouched.
export async function projectDelete(
    args: GqlSAdminMutationProjectDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(projects)
            .where(eq(projects.projectId, args.projectId))
            .returning({ projectId: projects.projectId });
        if (deleted.length === 0) {
            throw new Error(`projectDelete: row ${args.projectId} not found`);
        }
        return { success: true, referenceId: null };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
