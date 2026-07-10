import { and, eq, inArray } from 'drizzle-orm';
import { fileUploads, medicalRecordFiles } from '../db/schema';
import type { AdminMedicalRecordFileCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMedicalRecordFileAttachInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch attach of already-uploaded `FileUploads` rows to medical records.
// Same two-step upload contract as `adminInventoryItemFilesAttach` — the client first
// uploads bytes via `POST /api/file-uploads`, then calls this with the
// returned `fileUploadId`s. Ownership of every referenced upload is validated
// up-front against `userId` so a foreign id fails the whole batch with a
// clear error rather than an FK violation. `referenceIds` echoes the new
// `recordFileId` per input in input order.
export async function adminMedicalRecordFilesAttach(
    userId: string,
    inputs: readonly GqlSAdminMedicalRecordFileAttachInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction.
    const rows = inputs.map((input) => {
        const payload: AdminMedicalRecordFileCreate = {
            recordFileId: crypto.randomUUID(),
            recordId: input.recordId,
            fileUploadId: input.fileUploadId,
            label: input.label ?? null,
            pinned: input.pinned ?? false,
            updatedAt: now,
        };
        return { recordFileId: payload.recordFileId, payload };
    });

    // Phase 2 — transactional execution.
    try {
        const requestedFileUploadIds = Array.from(new Set(inputs.map((input) => input.fileUploadId)));
        const owned = await serverRuntime.db
            .select({ fileUploadId: fileUploads.fileUploadId })
            .from(fileUploads)
            .where(and(eq(fileUploads.userId, userId), inArray(fileUploads.fileUploadId, requestedFileUploadIds)));
        const ownedIds = new Set(owned.map((row) => row.fileUploadId));
        const foreign = requestedFileUploadIds.filter((id) => !ownedIds.has(id));
        if (foreign.length > 0) {
            throw new Error(`adminMedicalRecordFilesAttach: fileUpload(s) not owned by user ${userId}: ${foreign.join(', ')}`);
        }

        await serverRuntime.db.insert(medicalRecordFiles).values(rows.map((row) => row.payload));
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.recordFileId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
