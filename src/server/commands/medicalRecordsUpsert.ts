import { and, eq, inArray } from 'drizzle-orm';
import { fileUploads, medicalRecordFiles, medicalRecords } from '../db/schema';
import type { MedicalRecordCreate, MedicalRecordFileCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMedicalRecordInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch upsert of health-journal records with a per-row inline
// `fileUploadIds` attach path. Every input with a `recordId` is updated;
// every input without one is inserted under a freshly-minted UUID. The whole
// batch runs inside a single transaction so a partial failure rolls back to
// zero writes. `referenceIds` echoes the id per input row (in input order).
//
// The optional `fileUploadIds` on each row lets the sub-agent (and the
// manual editor) file a record and pin photos in the same mutation.
// Ownership of every referenced upload is validated up-front against `userId`
// (across all rows) — a foreign or non-existent id fails the whole batch
// rather than half-persisting.
export async function medicalRecordsUpsert(
    userId: string,
    inputs: readonly GqlSMedicalRecordInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction.
    const rows = inputs.map((input) => {
        const recordId = input.recordId ?? crypto.randomUUID();
        const payload: MedicalRecordCreate = {
            recordId,
            category: input.category,
            title: input.title,
            summary: input.summary,
            severity: input.severity ?? null,
            symptoms: input.symptoms,
            bodyAreas: input.bodyAreas,
            occurredAt: input.occurredAt ?? null,
            resolvedAt: input.resolvedAt ?? null,
            appointmentId: input.appointmentId ?? null,
            topics: input.topics,
            updatedAt: now,
        };
        const fileUploadIds = Array.from(new Set(input.fileUploadIds ?? []));
        return { recordId, isUpdate: Boolean(input.recordId), payload, fileUploadIds };
    });

    // Phase 2 — transactional execution.
    try {
        const requestedFileUploadIds = Array.from(new Set(rows.flatMap((row) => row.fileUploadIds)));
        if (requestedFileUploadIds.length > 0) {
            const owned = await serverRuntime.db
                .select({ fileUploadId: fileUploads.fileUploadId })
                .from(fileUploads)
                .where(and(eq(fileUploads.userId, userId), inArray(fileUploads.fileUploadId, requestedFileUploadIds)));
            if (owned.length !== requestedFileUploadIds.length) {
                throw new Error(
                    `medicalRecordsUpsert: ${requestedFileUploadIds.length - owned.length} of ${requestedFileUploadIds.length} fileUploadId(s) are not owned by user ${userId}`,
                );
            }
        }

        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.recordId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ recordId: medicalRecords.recordId })
                    .from(medicalRecords)
                    .where(inArray(medicalRecords.recordId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.recordId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`medicalRecordsUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction.update(medicalRecords).set(row.payload).where(eq(medicalRecords.recordId, row.recordId));
                } else {
                    await transaction.insert(medicalRecords).values(row.payload);
                }

                if (row.fileUploadIds.length === 0) continue;
                // Skip ids already joined to this record so an
                // update-with-fileUploadIds is idempotent.
                const attached = await transaction
                    .select({ fileUploadId: medicalRecordFiles.fileUploadId })
                    .from(medicalRecordFiles)
                    .where(eq(medicalRecordFiles.recordId, row.recordId));
                const attachedIds = new Set(attached.map((r) => r.fileUploadId));
                const toAttach = row.fileUploadIds.filter((id) => !attachedIds.has(id));
                if (toAttach.length > 0) {
                    const inserts: MedicalRecordFileCreate[] = toAttach.map((fileUploadId) => ({
                        recordFileId: crypto.randomUUID(),
                        recordId: row.recordId,
                        fileUploadId,
                        updatedAt: now,
                    }));
                    await transaction.insert(medicalRecordFiles).values(inserts);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.recordId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
