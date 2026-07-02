import { eq } from 'drizzle-orm';
import { itemFiles } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationItemFileDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Remove the item ↔ upload join. The underlying `FileUploads` row is
// preserved (same posture as `projectFileDelete`) — the upload belongs to
// the user, not the item. Cleanup of orphan uploads is user-cascade only.
export async function itemFileDelete(
    userId: string,
    args: GqlSAdminMutationItemFileDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(itemFiles)
            .where(eq(itemFiles.itemFileId, args.itemFileId))
            .returning({ itemFileId: itemFiles.itemFileId });
        if (deleted.length === 0) {
            throw new Error(`itemFileDelete: row ${args.itemFileId} not found`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
