import { eq, inArray } from 'drizzle-orm';
import { taxDocuments } from '../db/schema';
import type { AdminTaxDocumentCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminTaxDocumentInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch upsert of checklist documents. Rows with a `documentId` update (this
// is how the page flips `needed` → `received`), rows without insert. `status`
// defaults to `needed`. `referenceIds` echoes the id per input row in order.
export async function adminTaxDocumentsUpsert(
    userId: string,
    inputs: readonly GqlSAdminTaxDocumentInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction.
    const rows = inputs.map((input) => {
        const documentId = input.documentId ?? crypto.randomUUID();
        const payload: AdminTaxDocumentCreate = {
            documentId,
            taxYearId: input.taxYearId,
            kind: input.kind,
            title: input.title,
            status: input.status ?? 'needed',
            notes: input.notes ?? null,
            updatedAt: now,
        };
        return { documentId, isUpdate: Boolean(input.documentId), payload };
    });

    // Phase 2 — transactional execution.
    try {
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.documentId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ documentId: taxDocuments.documentId })
                    .from(taxDocuments)
                    .where(inArray(taxDocuments.documentId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.documentId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`adminTaxDocumentsUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction.update(taxDocuments).set(row.payload).where(eq(taxDocuments.documentId, row.documentId));
                } else {
                    await transaction.insert(taxDocuments).values(row.payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.documentId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
