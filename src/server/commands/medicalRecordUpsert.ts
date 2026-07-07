import { and, eq, inArray } from 'drizzle-orm';
import { fileUploads, medicalRecordFiles, medicalRecords } from '../db/schema';
import type { FileUpload, MedicalRecordCreate, MedicalRecordFileCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationMedicalRecordUpsertArgs, GqlSMedicalRecord, GqlSSession } from '../graphql/generated';
import { toGqlMedicalRecord } from '../mappers/toGqlMedicalRecord';
import { toGqlMedicalRecordFile } from '../mappers/toGqlMedicalRecordFile';

// Two-phase upsert with an inline `fileUploadIds` attach path. `recordId`
// set → update the record row and attach any new files not already
// attached; absent → insert. The optional `input.fileUploadIds` lets the
// sub-agent (and the manual editor) file a record and pin photos in one
// mutation — the composer alternative is to call `medicalRecordFileAttach`
// per file after the fact.
//
// Ownership on `fileUploadIds` is validated up-front against `userId` (same
// shape as `chatMessageCreate`) — a foreign or non-existent id fails the
// whole mutation rather than half-persisting a record.
export async function medicalRecordUpsert(
    userId: string,
    args: GqlSAdminMutationMedicalRecordUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMedicalRecord> {
    const { input } = args;
    const recordId = input.recordId ?? crypto.randomUUID();
    const now = new Date();

    const requestedFileUploadIds = Array.from(new Set(input.fileUploadIds ?? []));

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

    try {
        // Validate file-upload ownership before any writes.
        let ownedUploads: FileUpload[] = [];
        if (requestedFileUploadIds.length > 0) {
            ownedUploads = await serverRuntime.db
                .select()
                .from(fileUploads)
                .where(and(eq(fileUploads.userId, userId), inArray(fileUploads.fileUploadId, requestedFileUploadIds)));
            if (ownedUploads.length !== requestedFileUploadIds.length) {
                throw new Error(
                    `medicalRecordUpsert: ${requestedFileUploadIds.length - ownedUploads.length} of ${requestedFileUploadIds.length} fileUploadId(s) are not owned by user ${userId}`,
                );
            }
        }

        let row;
        if (input.recordId) {
            const [updated] = await serverRuntime.db
                .update(medicalRecords)
                .set(payload)
                .where(eq(medicalRecords.recordId, input.recordId))
                .returning();
            if (!updated) throw new Error(`medicalRecordUpsert: row ${input.recordId} not found`);
            row = updated;
        } else {
            const [inserted] = await serverRuntime.db.insert(medicalRecords).values(payload).returning();
            if (!inserted) throw new Error('medicalRecordUpsert: insert returned no rows');
            row = inserted;
        }

        // Attach new files: skip ids already joined to this record so an
        // update-with-fileUploadIds is idempotent.
        if (requestedFileUploadIds.length > 0) {
            const existing = await serverRuntime.db
                .select({ fileUploadId: medicalRecordFiles.fileUploadId })
                .from(medicalRecordFiles)
                .where(eq(medicalRecordFiles.recordId, recordId));
            const existingIds = new Set(existing.map((r) => r.fileUploadId));
            const toAttach = requestedFileUploadIds.filter((id) => !existingIds.has(id));
            if (toAttach.length > 0) {
                const inserts: MedicalRecordFileCreate[] = toAttach.map((fileUploadId) => ({
                    recordFileId: crypto.randomUUID(),
                    recordId,
                    fileUploadId,
                    updatedAt: now,
                }));
                await serverRuntime.db.insert(medicalRecordFiles).values(inserts);
            }
        }

        // Load the full attached-file set for the response — the update path
        // may have kept previously-attached files, so we always re-read.
        const allFileRows = await serverRuntime.db.select().from(medicalRecordFiles).where(eq(medicalRecordFiles.recordId, recordId));

        const uploadsById = new Map<string, FileUpload>();
        for (const u of ownedUploads) uploadsById.set(u.fileUploadId, u);
        const missingUploadIds = allFileRows.map((f) => f.fileUploadId).filter((id) => !uploadsById.has(id));
        if (missingUploadIds.length > 0) {
            const more = await serverRuntime.db.select().from(fileUploads).where(inArray(fileUploads.fileUploadId, missingUploadIds));
            for (const u of more) uploadsById.set(u.fileUploadId, u);
        }

        const files = allFileRows
            .map((f) => {
                const upload = uploadsById.get(f.fileUploadId);
                return upload ? toGqlMedicalRecordFile(f, upload) : null;
            })
            .filter((f): f is NonNullable<typeof f> => f !== null);

        await serverRuntime.publish.userUpdates({ userId });
        return toGqlMedicalRecord(row, files);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
