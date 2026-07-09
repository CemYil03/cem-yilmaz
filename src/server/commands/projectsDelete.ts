import { inArray } from 'drizzle-orm';
import { projects } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch delete of projects. The `Tasks.projectId` FK is `ON DELETE CASCADE`,
// so every project-bound task is wiped along with each project. Standalone
// todos (projectId IS NULL) are untouched. `referenceIds` echoes the deleted
// ids in input order — a caller-supplied id that never existed makes the
// batch throw.
export async function projectsDelete(
    userId: string,
    projectIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(projects)
            .where(inArray(projects.projectId, projectIds as string[]))
            .returning({ projectId: projects.projectId });
        if (deleted.length !== projectIds.length) {
            const found = new Set(deleted.map((row) => row.projectId));
            const missing = projectIds.filter((id) => !found.has(id));
            throw new Error(`projectsDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...projectIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
