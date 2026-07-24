import { and, eq } from 'drizzle-orm';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { fileUploads, workspaceFiles } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession, GqlSWorkspaceFile } from '../graphql/generated';
import { toGqlWorkspaceFile } from '../mappers/toGqlWorkspaceFile';

// Loads a single standalone workspace file by id, scoped to the requesting
// admin, and decodes its underlying upload bytes into a UTF-8 `content`
// string for the editor. Ownership is enforced here (the `userId` filter) so a
// stale/guessed id from another user reads as not-found rather than leaking.
//
// Throws when the file does not exist or is not owned by the admin.
export async function adminWorkspaceFileFindOne(
    workspaceFileId: string,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSWorkspaceFile> {
    const userId = requireAdminUserId(requestingSession);
    try {
        const [row] = await serverRuntime.db
            .select({ file: workspaceFiles, upload: fileUploads })
            .from(workspaceFiles)
            .innerJoin(fileUploads, eq(fileUploads.fileUploadId, workspaceFiles.fileUploadId))
            .where(and(eq(workspaceFiles.workspaceFileId, workspaceFileId), eq(workspaceFiles.userId, userId)))
            .limit(1);

        if (!row) throw new Error(`workspace file ${workspaceFileId} not found`);

        const content = Buffer.from(row.upload.bytes).toString('utf8');
        return toGqlWorkspaceFile(row.file, row.upload, content);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
