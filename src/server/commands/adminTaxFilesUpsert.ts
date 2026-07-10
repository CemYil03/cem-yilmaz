import { eq, inArray } from 'drizzle-orm';
import { taxFiles } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminTaxFileUpsert, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch edit of existing tax-file rows — label and pin state only. This
// mutation never creates rows (every input requires a `taxFileId`); use
// `adminTaxFilesAttach` to create. A field left out of the input is left
// untouched on the row so a pin toggle doesn't clobber the label.
// `referenceIds` echoes the `taxFileId` per input in input order.
export async function adminTaxFilesUpsert(
    userId: string,
    inputs: readonly GqlSAdminTaxFileUpsert[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction. Only present fields land in the `set`.
    const rows = inputs.map((input) => {
        const set: Partial<typeof taxFiles.$inferInsert> = { updatedAt: now };
        if (input.label !== undefined) set.label = input.label;
        if (input.pinned != null) set.pinned = input.pinned;
        return { taxFileId: input.taxFileId, set };
    });

    // Phase 2 — transactional execution.
    try {
        const taxFileIds = rows.map((row) => row.taxFileId);
        await serverRuntime.db.transaction(async (transaction) => {
            const existing = await transaction
                .select({ taxFileId: taxFiles.taxFileId })
                .from(taxFiles)
                .where(inArray(taxFiles.taxFileId, taxFileIds));
            if (existing.length !== new Set(taxFileIds).size) {
                const found = new Set(existing.map((row) => row.taxFileId));
                const missing = taxFileIds.filter((id) => !found.has(id));
                throw new Error(`adminTaxFilesUpsert: rows not found: ${missing.join(', ')}`);
            }
            for (const row of rows) {
                await transaction.update(taxFiles).set(row.set).where(eq(taxFiles.taxFileId, row.taxFileId));
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: taxFileIds };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
