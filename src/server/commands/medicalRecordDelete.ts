import { eq } from 'drizzle-orm';
import { medicalRecords } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationMedicalRecordDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Delete a record. The FK cascade on `MedicalRecordFiles` removes join
// rows; the underlying `FileUploads` bytes stay put (only reachable by id
// once orphaned, cleaned by the user cascade if the user is ever removed).
export async function medicalRecordDelete(
    userId: string,
    args: GqlSAdminMutationMedicalRecordDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(medicalRecords)
            .where(eq(medicalRecords.recordId, args.recordId))
            .returning({ recordId: medicalRecords.recordId });
        if (deleted.length === 0) throw new Error(`medicalRecordDelete: row ${args.recordId} not found`);
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
