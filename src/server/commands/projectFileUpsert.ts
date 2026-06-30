import { eq } from 'drizzle-orm';
import { fileUploads, projectFiles } from '../db/schema';
import type { ProjectFileCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationProjectFileUpsertArgs, GqlSProjectFile, GqlSSession } from '../graphql/generated';
import { toGqlProjectFile } from '../mappers/toGqlProjectFile';

// Create or update a project file row. The underlying upload must already
// exist in `FileUploads` — the client uploads via `POST /api/file-uploads`
// first, then calls this with the returned id. `activityId` is honoured
// only on create.
export async function projectFileUpsert(
    userId: string,
    args: GqlSAdminMutationProjectFileUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSProjectFile> {
    const { input } = args;

    const now = new Date();
    const projectFileId = input.projectFileId ?? crypto.randomUUID();
    const payload: ProjectFileCreate = {
        projectFileId,
        projectId: input.projectId,
        activityId: input.activityId ?? null,
        fileUploadId: input.fileUploadId,
        label: input.label ?? null,
        kind: input.kind,
        pinned: input.pinned ?? false,
        updatedAt: now,
    };

    try {
        if (input.projectFileId) {
            const [updated] = await serverRuntime.db
                .update(projectFiles)
                .set({
                    label: payload.label,
                    kind: payload.kind,
                    pinned: payload.pinned,
                    updatedAt: now,
                })
                .where(eq(projectFiles.projectFileId, input.projectFileId))
                .returning();
            if (!updated) throw new Error(`projectFileUpsert: row ${input.projectFileId} not found`);
            const [upload] = await serverRuntime.db
                .select()
                .from(fileUploads)
                .where(eq(fileUploads.fileUploadId, updated.fileUploadId))
                .limit(1);
            if (!upload) throw new Error(`projectFileUpsert: upload ${updated.fileUploadId} not found`);
            await serverRuntime.publish.userUpdates({ userId });
            return toGqlProjectFile(updated, upload);
        }
        // Validate the upload exists before inserting so the FK violation
        // gives a clearer error than the raw Postgres message.
        const [upload] = await serverRuntime.db.select().from(fileUploads).where(eq(fileUploads.fileUploadId, input.fileUploadId)).limit(1);
        if (!upload) throw new Error(`projectFileUpsert: fileUpload ${input.fileUploadId} not found`);
        const [inserted] = await serverRuntime.db.insert(projectFiles).values(payload).returning();
        if (!inserted) throw new Error('projectFileUpsert: insert returned no rows');
        await serverRuntime.publish.userUpdates({ userId });
        return toGqlProjectFile(inserted, upload);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
