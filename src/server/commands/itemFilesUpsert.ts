import { eq, inArray } from 'drizzle-orm';
import { itemFiles } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSItemFileUpsert, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch edit of existing item-file rows — label and pin state only. This
// mutation never creates rows (every input requires an `itemFileId`); use
// `itemFilesAttach` to create. The pin toggle in the UI collapses into this:
// pass the existing row's id with the flipped `pinned`. A field left out of
// the input is left untouched on the row so a pin toggle doesn't clobber the
// label. The whole batch runs in a single transaction with a pre-flight
// existence check. `referenceIds` echoes the `itemFileId` per input in input
// order.
export async function itemFilesUpsert(
    userId: string,
    inputs: readonly GqlSItemFileUpsert[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction. Only the fields present on the input
    // land in the `set`, so a pin toggle leaves the label alone.
    const rows = inputs.map((input) => {
        const set: Partial<typeof itemFiles.$inferInsert> = { updatedAt: now };
        if (input.label !== undefined) set.label = input.label;
        if (input.pinned != null) set.pinned = input.pinned;
        return { itemFileId: input.itemFileId, set };
    });

    // Phase 2 — transactional execution.
    try {
        const itemFileIds = rows.map((row) => row.itemFileId);
        await serverRuntime.db.transaction(async (transaction) => {
            const existing = await transaction
                .select({ itemFileId: itemFiles.itemFileId })
                .from(itemFiles)
                .where(inArray(itemFiles.itemFileId, itemFileIds));
            if (existing.length !== new Set(itemFileIds).size) {
                const found = new Set(existing.map((row) => row.itemFileId));
                const missing = itemFileIds.filter((id) => !found.has(id));
                throw new Error(`itemFilesUpsert: rows not found: ${missing.join(', ')}`);
            }
            for (const row of rows) {
                await transaction.update(itemFiles).set(row.set).where(eq(itemFiles.itemFileId, row.itemFileId));
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: itemFileIds };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
