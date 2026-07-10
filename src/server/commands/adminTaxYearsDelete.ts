import { inArray } from 'drizzle-orm';
import { taxYears } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch hard delete of tax years. The FK cascades remove income sources,
// expenses, documents, and file joins; the underlying `FileUploads` bytes
// stay put (they belong to the user). `referenceIds` echoes the deleted ids
// in input order — an id that never existed makes the batch throw.
export async function adminTaxYearsDelete(
    userId: string,
    taxYearIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(taxYears)
            .where(inArray(taxYears.taxYearId, taxYearIds as string[]))
            .returning({ taxYearId: taxYears.taxYearId });
        if (deleted.length !== taxYearIds.length) {
            const found = new Set(deleted.map((row) => row.taxYearId));
            const missing = taxYearIds.filter((id) => !found.has(id));
            throw new Error(`adminTaxYearsDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...taxYearIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
