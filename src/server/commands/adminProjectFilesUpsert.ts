import { eq, inArray } from 'drizzle-orm';
import { fileUploads, projectFiles } from '../db/schema';
import type { AdminProjectFileCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminProjectFileUpsert, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch create-or-update of project files. Every input with a `projectFileId`
// is updated; every input without one is inserted. The underlying upload must
// already exist in `FileUploads` — the client uploads via
// `POST /api/file-uploads` first, then calls this with the returned id.
// `activityId` is honoured only on create; the update path rewrites only
// label / kind / pinned and leaves projectId / activityId / fileUploadId
// untouched.
//
// Pin toggles ride this same mutation: the caller passes the existing row
// (from the subscription payload) with `pinned` flipped. There is no separate
// toggle path. The whole batch runs inside a single transaction so a partial
// failure rolls back to zero writes. `referenceIds` echoes the id per input
// row (in input order).
export async function adminProjectFilesUpsert(
    userId: string,
    inputs: readonly GqlSAdminProjectFileUpsert[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction.
    const rows = inputs.map((input) => {
        const projectFileId = input.projectFileId ?? crypto.randomUUID();
        const isUpdate = Boolean(input.projectFileId);
        const payload: AdminProjectFileCreate = {
            projectFileId,
            projectId: input.projectId,
            activityId: input.activityId ?? null,
            fileUploadId: input.fileUploadId,
            label: input.label ?? null,
            kind: input.kind,
            pinned: input.pinned ?? false,
            updatedAt: now,
        };
        return { projectFileId, isUpdate, fileUploadId: input.fileUploadId, payload };
    });

    // Phase 2 — transactional execution.
    try {
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.projectFileId);
        const insertUploadIds = Array.from(new Set(rows.filter((row) => !row.isUpdate).map((row) => row.fileUploadId)));
        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ projectFileId: projectFiles.projectFileId })
                    .from(projectFiles)
                    .where(inArray(projectFiles.projectFileId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.projectFileId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`adminProjectFilesUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            // Validate every referenced upload exists before inserting so the
            // FK violation gives a clearer error than the raw Postgres message.
            if (insertUploadIds.length > 0) {
                const uploads = await transaction
                    .select({ fileUploadId: fileUploads.fileUploadId })
                    .from(fileUploads)
                    .where(inArray(fileUploads.fileUploadId, insertUploadIds));
                if (uploads.length !== insertUploadIds.length) {
                    const found = new Set(uploads.map((row) => row.fileUploadId));
                    const missing = insertUploadIds.filter((id) => !found.has(id));
                    throw new Error(`adminProjectFilesUpsert: fileUpload(s) not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction
                        .update(projectFiles)
                        .set({
                            label: row.payload.label,
                            kind: row.payload.kind,
                            pinned: row.payload.pinned,
                            updatedAt: now,
                        })
                        .where(eq(projectFiles.projectFileId, row.projectFileId));
                } else {
                    await transaction.insert(projectFiles).values(row.payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.projectFileId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
