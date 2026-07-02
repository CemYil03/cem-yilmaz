import { eq, not } from 'drizzle-orm';
import { fileUploads, itemFiles } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationItemFileTogglePinArgs, GqlSItemFile, GqlSSession } from '../graphql/generated';
import { toGqlItemFile } from '../mappers/toGqlItemFile';

// Flip the `pinned` boolean. Same shape as `projectFileTogglePin`.
export async function itemFileTogglePin(
    userId: string,
    args: GqlSAdminMutationItemFileTogglePinArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSItemFile> {
    const now = new Date();
    try {
        const [updated] = await serverRuntime.db
            .update(itemFiles)
            .set({ pinned: not(itemFiles.pinned), updatedAt: now })
            .where(eq(itemFiles.itemFileId, args.itemFileId))
            .returning();
        if (!updated) throw new Error(`itemFileTogglePin: row ${args.itemFileId} not found`);
        const [upload] = await serverRuntime.db
            .select()
            .from(fileUploads)
            .where(eq(fileUploads.fileUploadId, updated.fileUploadId))
            .limit(1);
        if (!upload) throw new Error(`itemFileTogglePin: upload ${updated.fileUploadId} not found`);
        await serverRuntime.publish.userUpdates({ userId });
        return toGqlItemFile(updated, upload);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
