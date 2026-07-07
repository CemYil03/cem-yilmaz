import { eq } from 'drizzle-orm';
import { medicalRecordFiles } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationMedicalRecordFileDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Remove the join row that pins a `FileUploads` blob to a medical record.
// The underlying upload row is *not* removed — a file can in principle be
// referenced from more than one surface, so orphaning it (rather than
// deleting the bytes) is the conservative default. The user's cascade
// on `FileUploads` picks up the blob if it's ever truly abandoned.
export async function medicalRecordFileDelete(
    userId: string,
    args: GqlSAdminMutationMedicalRecordFileDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(medicalRecordFiles)
            .where(eq(medicalRecordFiles.recordFileId, args.recordFileId))
            .returning({ recordFileId: medicalRecordFiles.recordFileId });
        if (deleted.length === 0) throw new Error(`medicalRecordFileDelete: row ${args.recordFileId} not found`);
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
