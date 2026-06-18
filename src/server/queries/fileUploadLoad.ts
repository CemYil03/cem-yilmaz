import { eq } from 'drizzle-orm';
import type { Database, DatabaseTransaction } from '../db';
import { fileUploads } from '../db/schema';
import type { FileUpload } from '../db/schema';

// By-id load of a single file upload, including its bytes. Used by the
// download HTTP route (which also handles authorization) and any future path
// that needs the raw payload — `toModelMessages` reads attachments out of the
// joined-row payload instead, so it doesn't go through this query.
export async function fileUploadLoad(dbOrTransaction: Database | DatabaseTransaction, fileUploadId: string): Promise<FileUpload | null> {
    const rows = await dbOrTransaction.select().from(fileUploads).where(eq(fileUploads.fileUploadId, fileUploadId)).limit(1);
    return rows[0] ?? null;
}
