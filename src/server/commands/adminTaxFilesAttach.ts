import { and, eq, inArray } from 'drizzle-orm';
import { fileUploads, taxFiles } from '../db/schema';
import type { AdminTaxFileCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminTaxFileAttachInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch attach of already-uploaded `FileUploads` rows to a tax year, and
// optionally to a specific expense (a receipt) or checklist document (a scan).
// Same two-step upload contract as `adminInventoryItemFilesAttach` — the
// client first uploads bytes via `POST /api/file-uploads`, then calls this
// with the returned `fileUploadId`s. Ownership of every referenced upload is
// validated up-front against `userId` so a foreign id fails the whole batch
// with a clear error rather than an FK violation. `referenceIds` echoes the
// new `taxFileId` per input in input order.
export async function adminTaxFilesAttach(
    userId: string,
    inputs: readonly GqlSAdminTaxFileAttachInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction.
    const rows = inputs.map((input) => {
        const payload: AdminTaxFileCreate = {
            taxFileId: crypto.randomUUID(),
            taxYearId: input.taxYearId,
            expenseId: input.expenseId ?? null,
            documentId: input.documentId ?? null,
            fileUploadId: input.fileUploadId,
            label: input.label ?? null,
            kind: input.kind,
            pinned: input.pinned ?? false,
            updatedAt: now,
        };
        return { taxFileId: payload.taxFileId, payload };
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
            throw new Error(`adminTaxFilesAttach: fileUpload(s) not owned by user ${userId}: ${foreign.join(', ')}`);
        }

        await serverRuntime.db.insert(taxFiles).values(rows.map((row) => row.payload));
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.taxFileId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
