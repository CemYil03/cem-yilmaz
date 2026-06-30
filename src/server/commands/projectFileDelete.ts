import { eq } from 'drizzle-orm';
import { projectFiles } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationProjectFileDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Permanent delete of a project-file row. The underlying `FileUpload` blob
// stays — it may still be referenced from elsewhere (e.g. a chat message),
// and the user-row cascade reclaims storage when the owner goes. If we
// later want eager cleanup, do it here only after confirming no other
// reference exists.
export async function projectFileDelete(
    userId: string,
    args: GqlSAdminMutationProjectFileDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(projectFiles)
            .where(eq(projectFiles.projectFileId, args.projectFileId))
            .returning({ projectFileId: projectFiles.projectFileId });
        if (deleted.length === 0) {
            throw new Error(`projectFileDelete: row ${args.projectFileId} not found`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
