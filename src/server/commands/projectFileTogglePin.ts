import { eq, not } from 'drizzle-orm';
import { fileUploads, projectFiles } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationProjectFileTogglePinArgs, GqlSProjectFile, GqlSSession } from '../graphql/generated';
import { toGqlProjectFile } from '../mappers/toGqlProjectFile';

// Flip `pinned` on a single file row. Returns the row plus its upload so
// the URQL cache update is a straight write — same shape as the upsert
// mutation's return.
export async function projectFileTogglePin(
    userId: string,
    args: GqlSAdminMutationProjectFileTogglePinArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSProjectFile> {
    try {
        const [updated] = await serverRuntime.db
            .update(projectFiles)
            .set({ pinned: not(projectFiles.pinned), updatedAt: new Date() })
            .where(eq(projectFiles.projectFileId, args.projectFileId))
            .returning();
        if (!updated) throw new Error(`projectFileTogglePin: row ${args.projectFileId} not found`);
        const [upload] = await serverRuntime.db
            .select()
            .from(fileUploads)
            .where(eq(fileUploads.fileUploadId, updated.fileUploadId))
            .limit(1);
        if (!upload) throw new Error(`projectFileTogglePin: upload ${updated.fileUploadId} not found`);
        await serverRuntime.publish.userUpdates({ userId });
        return toGqlProjectFile(updated, upload);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
