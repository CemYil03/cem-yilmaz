import { inArray } from 'drizzle-orm';
import { medicalRecords } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch delete of records. The FK cascade on `MedicalRecordFiles` removes
// join rows; the underlying `FileUploads` bytes stay put (cleaned by the
// user cascade if the user is ever removed). A caller-supplied id that never
// existed makes the batch throw.
export async function medicalRecordsDelete(
    userId: string,
    recordIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(medicalRecords)
            .where(inArray(medicalRecords.recordId, recordIds as string[]))
            .returning({ recordId: medicalRecords.recordId });
        if (deleted.length !== recordIds.length) {
            const found = new Set(deleted.map((row) => row.recordId));
            const missing = recordIds.filter((id) => !found.has(id));
            throw new Error(`medicalRecordsDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...recordIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
