import { eq, inArray } from 'drizzle-orm';
import { items } from '../db/schema';
import type { ItemCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSItemInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch upsert of items. Every input with an `itemId` is updated; every input
// without one is inserted under a freshly-minted UUID. The whole batch runs
// inside a single transaction so a partial failure rolls back to zero writes.
// `referenceIds` echoes the id per input row (in input order) so the caller
// can address newly-created rows without a follow-up read.
//
// Disposal is a plain field-set carried here — there is no separate
// `itemDispose` mutation. `disposedAt` is forced null whenever `disposalState`
// is `owned`, and defaults to now when transitioning into a disposal state
// without an explicit stamp. Editing an item preserves its current disposal
// state because the caller spreads the existing row (which carries
// `disposalState` + `disposedAt`).
//
// `currentValueCents` is *not* editable through this mutation — it is owned
// by `itemsReprice`, which writes the valuations journal in the same
// transaction. On create the cache is seeded with the purchase price so the
// material-net-worth number is non-zero from the first save.
export async function itemsUpsert(
    userId: string,
    inputs: readonly GqlSItemInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction.
    const rows = inputs.map((input) => {
        const itemId = input.itemId ?? crypto.randomUUID();
        const isUpdate = Boolean(input.itemId);
        const disposalState = input.disposalState ?? 'owned';
        const disposedAt = disposalState === 'owned' ? null : (input.disposedAt ?? now);
        const payload: ItemCreate = {
            itemId,
            categoryKey: input.categoryKey,
            name: input.name,
            brand: input.brand ?? null,
            model: input.model ?? null,
            serialNumber: input.serialNumber ?? null,
            purchasedAt: input.purchasedAt ?? null,
            purchasePriceCents: input.purchasePriceCents ?? null,
            condition: input.condition ?? null,
            disposalState,
            disposedAt,
            warrantyEndsAt: input.warrantyEndsAt ?? null,
            warrantyProvider: input.warrantyProvider ?? null,
            warrantyNotes: input.warrantyNotes ?? null,
            notes: input.notes ?? null,
            updatedAt: now,
        };
        // The cached current value belongs to `itemsReprice`; only seed it on
        // create so the net-worth number is non-zero from the first save. On
        // update the column is left untouched (omitted from the `set`).
        if (!isUpdate) payload.currentValueCents = input.purchasePriceCents ?? null;
        return { itemId, isUpdate, payload };
    });

    // Phase 2 — transactional execution.
    try {
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.itemId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction.select({ itemId: items.itemId }).from(items).where(inArray(items.itemId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.itemId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`itemsUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction.update(items).set(row.payload).where(eq(items.itemId, row.itemId));
                } else {
                    await transaction.insert(items).values(row.payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.itemId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
