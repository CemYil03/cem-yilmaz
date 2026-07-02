import { eq } from 'drizzle-orm';
import { fileUploads, itemFiles } from '../db/schema';
import type { ItemFileCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationItemFileAttachArgs, GqlSItemFile, GqlSSession } from '../graphql/generated';
import { toGqlItemFile } from '../mappers/toGqlItemFile';

// Attach an already-uploaded `FileUploads` row to an item (and optionally
// to a specific service entry). Same two-step pattern as
// `projectFileUpsert` — the client uploads bytes via `POST /api/file-uploads`
// first, then calls this with the returned `fileUploadId`.
export async function itemFileAttach(
    userId: string,
    args: GqlSAdminMutationItemFileAttachArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSItemFile> {
    const { input } = args;
    const now = new Date();

    try {
        // Validate the upload exists before inserting so the FK violation
        // gives a clearer error than the raw Postgres message.
        const [upload] = await serverRuntime.db.select().from(fileUploads).where(eq(fileUploads.fileUploadId, input.fileUploadId)).limit(1);
        if (!upload) throw new Error(`itemFileAttach: fileUpload ${input.fileUploadId} not found`);

        const payload: ItemFileCreate = {
            itemFileId: crypto.randomUUID(),
            itemId: input.itemId,
            serviceEntryId: input.serviceEntryId ?? null,
            fileUploadId: input.fileUploadId,
            label: input.label ?? null,
            kind: input.kind,
            pinned: input.pinned ?? false,
            updatedAt: now,
        };
        const [inserted] = await serverRuntime.db.insert(itemFiles).values(payload).returning();
        if (!inserted) throw new Error('itemFileAttach: insert returned no rows');
        await serverRuntime.publish.userUpdates({ userId });
        return toGqlItemFile(inserted, upload);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
