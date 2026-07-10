import { inArray } from 'drizzle-orm';
import { medicalRecordFiles } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch remove of the join rows that pin `FileUploads` blobs to medical
// records. The underlying upload rows are *not* removed — a file can in
// principle be referenced from more than one surface, so orphaning it
// (rather than deleting the bytes) is the conservative default. A
// caller-supplied id that never existed makes the batch throw.
export async function adminMedicalRecordFilesDelete(
    userId: string,
    recordFileIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(medicalRecordFiles)
            .where(inArray(medicalRecordFiles.recordFileId, recordFileIds as string[]))
            .returning({ recordFileId: medicalRecordFiles.recordFileId });
        if (deleted.length !== recordFileIds.length) {
            const found = new Set(deleted.map((row) => row.recordFileId));
            const missing = recordFileIds.filter((id) => !found.has(id));
            throw new Error(`adminMedicalRecordFilesDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...recordFileIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
