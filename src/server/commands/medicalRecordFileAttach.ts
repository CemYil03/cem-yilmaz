import { and, eq } from 'drizzle-orm';
import { fileUploads, medicalRecordFiles } from '../db/schema';
import type { MedicalRecordFileCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationMedicalRecordFileAttachArgs, GqlSMedicalRecordFile, GqlSSession } from '../graphql/generated';
import { toGqlMedicalRecordFile } from '../mappers/toGqlMedicalRecordFile';

// Attach an already-uploaded `FileUploads` row to a medical record. Same
// two-step pattern as `itemFileAttach` — the client first uploads bytes via
// `POST /api/file-uploads`, then calls this with the returned
// `fileUploadId`. Ownership is validated up-front against `userId` so a
// foreign id fails with a clear error rather than an FK violation.
export async function medicalRecordFileAttach(
    userId: string,
    args: GqlSAdminMutationMedicalRecordFileAttachArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMedicalRecordFile> {
    const { input } = args;
    const now = new Date();

    try {
        const [upload] = await serverRuntime.db
            .select()
            .from(fileUploads)
            .where(and(eq(fileUploads.fileUploadId, input.fileUploadId), eq(fileUploads.userId, userId)))
            .limit(1);
        if (!upload) throw new Error(`medicalRecordFileAttach: fileUpload ${input.fileUploadId} not owned by user ${userId}`);

        const payload: MedicalRecordFileCreate = {
            recordFileId: crypto.randomUUID(),
            recordId: input.recordId,
            fileUploadId: input.fileUploadId,
            label: input.label ?? null,
            pinned: input.pinned ?? false,
            updatedAt: now,
        };
        const [inserted] = await serverRuntime.db.insert(medicalRecordFiles).values(payload).returning();
        if (!inserted) throw new Error('medicalRecordFileAttach: insert returned no rows');
        await serverRuntime.publish.userUpdates({ userId });
        return toGqlMedicalRecordFile(inserted, upload);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
