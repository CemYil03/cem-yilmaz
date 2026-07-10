import { eq, inArray } from 'drizzle-orm';
import { itemValuations, items } from '../db/schema';
import type { AdminInventoryItemValuationCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminInventoryItemRepriceInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch repricing. For each input, insert one `ItemValuations` journal row and
// update the cached `items.currentValueCents` so list / overview reads never
// hit the journal. The whole batch runs in a single transaction so a partial
// failure rolls back to zero writes. `valuedAt` is settable so a back-dated
// appraisal is honoured; callers typically write "now"-timestamped rows so we
// simply overwrite the cache — the sparkline reads the journal directly, and
// the cache is a convenience. `referenceIds` echoes the `itemId` per input in
// input order.
//
// Kept separate from `adminInventoryItemsUpsert` because a reprice is more than a field-set:
// it appends a journal row, so a naive upsert could silently overwrite the
// cache without a matching journal entry.
export async function adminInventoryItemsReprice(
    userId: string,
    inputs: readonly GqlSAdminInventoryItemRepriceInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction.
    const rows = inputs.map((input) => {
        const valuation: AdminInventoryItemValuationCreate = {
            valuationId: crypto.randomUUID(),
            itemId: input.itemId,
            valueCents: input.valueCents,
            valuedAt: input.valuedAt ?? now,
            note: input.note ?? null,
        };
        return { itemId: input.itemId, valueCents: input.valueCents, valuation };
    });

    // Phase 2 — transactional execution.
    try {
        const itemIds = Array.from(new Set(rows.map((row) => row.itemId)));
        await serverRuntime.db.transaction(async (transaction) => {
            const existing = await transaction.select({ itemId: items.itemId }).from(items).where(inArray(items.itemId, itemIds));
            if (existing.length !== itemIds.length) {
                const found = new Set(existing.map((row) => row.itemId));
                const missing = itemIds.filter((id) => !found.has(id));
                throw new Error(`adminInventoryItemsReprice: rows not found: ${missing.join(', ')}`);
            }
            for (const row of rows) {
                await transaction.insert(itemValuations).values(row.valuation);
                await transaction
                    .update(items)
                    .set({ currentValueCents: row.valueCents, updatedAt: now })
                    .where(eq(items.itemId, row.itemId));
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.itemId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
