import { and, eq } from 'drizzle-orm';
import { fileUploads, workspaceFiles } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Overwrites a standalone workspace file's markdown body in place. Both the
// editor Save button and the assistant's `workspaceFileUpdate` tool land here.
//
// The bytes are rewritten on the SAME `fileUploads` row (not a fresh upload) so
// the file's `fileUploadId` — and therefore its `/api/file-uploads/:id`
// download URL — stays stable across edits. Ownership is enforced by matching
// both `workspaceFileId` and `userId`; a mismatch reads as not-found. A `label`
// of `null` leaves the existing label untouched (v1 has no clear-label path);
// pass a non-null string to rename. The whole thing runs in one transaction so
// a partial write can't leave the metadata row and the bytes disagreeing.
// `referenceIds` echoes the `workspaceFileId`.
export async function adminWorkspaceFileUpdate(
    userId: string,
    workspaceFileId: string,
    content: string,
    label: string | null,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();
    const bytes = Buffer.from(content, 'utf8');

    try {
        await serverRuntime.db.transaction(async (transaction) => {
            const [existing] = await transaction
                .select({ fileUploadId: workspaceFiles.fileUploadId })
                .from(workspaceFiles)
                .where(and(eq(workspaceFiles.workspaceFileId, workspaceFileId), eq(workspaceFiles.userId, userId)))
                .limit(1);
            if (!existing) throw new Error(`adminWorkspaceFileUpdate: workspace file not found: ${workspaceFileId}`);

            await transaction
                .update(fileUploads)
                .set({ bytes, size: bytes.byteLength })
                .where(eq(fileUploads.fileUploadId, existing.fileUploadId));

            await transaction
                .update(workspaceFiles)
                .set(label === null ? { updatedAt: now } : { label, updatedAt: now })
                .where(eq(workspaceFiles.workspaceFileId, workspaceFileId));
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [workspaceFileId] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
