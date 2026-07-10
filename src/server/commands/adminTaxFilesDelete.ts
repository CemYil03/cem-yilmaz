import { inArray } from 'drizzle-orm';
import { taxFiles } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch detach of tax-file join rows. Only the join is removed; the underlying
// `FileUploads` bytes stay put (they belong to the user). `referenceIds`
// echoes the deleted ids in input order — an id that never existed throws.
export async function adminTaxFilesDelete(
    userId: string,
    taxFileIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(taxFiles)
            .where(inArray(taxFiles.taxFileId, taxFileIds as string[]))
            .returning({ taxFileId: taxFiles.taxFileId });
        if (deleted.length !== taxFileIds.length) {
            const found = new Set(deleted.map((row) => row.taxFileId));
            const missing = taxFileIds.filter((id) => !found.has(id));
            throw new Error(`adminTaxFilesDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...taxFileIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
