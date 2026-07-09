import { inArray } from 'drizzle-orm';
import { projectFiles } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch permanent delete of project-file rows. The underlying `FileUpload`
// blob stays — it may still be referenced from elsewhere (e.g. a chat
// message), and the user-row cascade reclaims storage when the owner goes.
// `referenceIds` echoes the deleted ids in input order — a caller-supplied id
// that never existed makes the batch throw.
export async function projectFilesDelete(
    userId: string,
    projectFileIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(projectFiles)
            .where(inArray(projectFiles.projectFileId, projectFileIds as string[]))
            .returning({ projectFileId: projectFiles.projectFileId });
        if (deleted.length !== projectFileIds.length) {
            const found = new Set(deleted.map((row) => row.projectFileId));
            const missing = projectFileIds.filter((id) => !found.has(id));
            throw new Error(`projectFilesDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...projectFileIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
