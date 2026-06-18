import type { Database } from '../db';
import { fileUploads } from '../db/schema';
import type { FileUpload, FileUploadCreate } from '../db/schema';

// Persists a single uploaded file into `FileUploads`. The upload route
// (`src/routes/api/file-uploads.ts`) enforces the per-file size cap and
// authorization (session must own a user). This command itself is a thin
// two-phase write — payload then a single insert — so it can also be reused
// from tests and from any future bulk-import path.
//
// The bytes are passed in as a Node `Buffer` (the multipart parser already
// reads the whole body into memory; we keep that semantics rather than
// streaming to the column, which `bytea` doesn't support out of the box).

interface FileUploadCreateInput {
    userId: string;
    filename: string;
    mediaType: string;
    bytes: Buffer;
}

export async function fileUploadCreate(db: Database, input: FileUploadCreateInput): Promise<FileUpload> {
    // Phase 1 — payload construction (pure, no DB calls).
    const insert: FileUploadCreate = {
        fileUploadId: crypto.randomUUID(),
        userId: input.userId,
        filename: input.filename,
        mediaType: input.mediaType,
        size: input.bytes.byteLength,
        bytes: input.bytes,
    };

    // Phase 2 — single insert; no transaction needed (PG statements are atomic).
    try {
        const [created] = await db.insert(fileUploads).values(insert).returning();
        if (!created) throw new Error('fileUploadCreate: insert returned no rows');
        return created;
    } catch (error) {
        console.error(error);
        throw error;
    }
}
