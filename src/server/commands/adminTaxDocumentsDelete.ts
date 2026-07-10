import { inArray } from 'drizzle-orm';
import { taxDocuments } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch hard delete of checklist documents. Attached `taxFiles.documentId` are
// nulled via the FK (the scan stays on the year). Use `notApplicable` status
// as the softer alternative to retire a checklist row. `referenceIds` echoes
// the deleted ids in input order — an id that never existed makes it throw.
export async function adminTaxDocumentsDelete(
    userId: string,
    documentIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(taxDocuments)
            .where(inArray(taxDocuments.documentId, documentIds as string[]))
            .returning({ documentId: taxDocuments.documentId });
        if (deleted.length !== documentIds.length) {
            const found = new Set(deleted.map((row) => row.documentId));
            const missing = documentIds.filter((id) => !found.has(id));
            throw new Error(`adminTaxDocumentsDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...documentIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
