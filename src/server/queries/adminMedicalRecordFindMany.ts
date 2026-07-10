import { asc, desc, inArray } from 'drizzle-orm';
import { fileUploads, medicalRecordFiles, medicalRecords } from '../db/schema';
import type { FileUpload, AdminMedicalRecordFile } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMedicalRecord, GqlSSession } from '../graphql/generated';
import { toGqlAdminMedicalRecord } from '../mappers/toGqlAdminMedicalRecord';
import { toGqlAdminMedicalRecordFile } from '../mappers/toGqlAdminMedicalRecordFile';

// Lists every medical record with its attached files. Ordered by
// `occurredAt` (falling back to `createdAt`) descending — the most recent
// health event on top. The join fan-out is the `itemGet` pattern: one
// query per relation, then normalize in memory.
export async function adminMedicalRecordFindMany(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminMedicalRecord[]> {
    try {
        const rows = await serverRuntime.db
            .select()
            .from(medicalRecords)
            .orderBy(desc(medicalRecords.occurredAt), desc(medicalRecords.createdAt), asc(medicalRecords.recordId));

        if (rows.length === 0) return [];

        const recordIds = rows.map((r) => r.recordId);
        const fileRows = await serverRuntime.db
            .select()
            .from(medicalRecordFiles)
            .where(inArray(medicalRecordFiles.recordId, recordIds))
            .orderBy(desc(medicalRecordFiles.pinned), desc(medicalRecordFiles.createdAt));

        const uploadsById = new Map<string, FileUpload>();
        if (fileRows.length > 0) {
            const uploadIds = Array.from(new Set(fileRows.map((f) => f.fileUploadId)));
            const uploadRows = await serverRuntime.db.select().from(fileUploads).where(inArray(fileUploads.fileUploadId, uploadIds));
            for (const u of uploadRows) uploadsById.set(u.fileUploadId, u);
        }

        const filesByRecordId = new Map<string, AdminMedicalRecordFile[]>();
        for (const f of fileRows) {
            const list = filesByRecordId.get(f.recordId) ?? [];
            list.push(f);
            filesByRecordId.set(f.recordId, list);
        }

        // If an upload row is missing (deleted out-of-band), we skip that
        // file rather than throw — the record still surfaces.
        return rows.map((row) => {
            const files = (filesByRecordId.get(row.recordId) ?? [])
                .map((f) => {
                    const upload = uploadsById.get(f.fileUploadId);
                    return upload ? toGqlAdminMedicalRecordFile(f, upload) : null;
                })
                .filter((f): f is NonNullable<typeof f> => f !== null);
            return toGqlAdminMedicalRecord(row, files);
        });
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
