import { inArray } from 'drizzle-orm';
import { projectLinks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch permanent delete of project-link rows. The underlying resource (the
// URL itself) is unmanaged — this just removes the project-side reference.
// `referenceIds` echoes the deleted ids in input order — a caller-supplied id
// that never existed makes the batch throw.
export async function adminProjectLinksDelete(
    userId: string,
    projectLinkIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(projectLinks)
            .where(inArray(projectLinks.projectLinkId, projectLinkIds as string[]))
            .returning({ projectLinkId: projectLinks.projectLinkId });
        if (deleted.length !== projectLinkIds.length) {
            const found = new Set(deleted.map((row) => row.projectLinkId));
            const missing = projectLinkIds.filter((id) => !found.has(id));
            throw new Error(`adminProjectLinksDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...projectLinkIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
