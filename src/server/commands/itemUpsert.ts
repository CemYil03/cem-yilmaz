import { eq } from 'drizzle-orm';
import { items } from '../db/schema';
import type { ItemCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationItemUpsertArgs, GqlSItem, GqlSSession } from '../graphql/generated';
import { toGqlItem } from '../mappers/toGqlItem';

// Two-phase upsert (same shape as `movieUpsert`). Phase 1 builds the
// insert/update payload off the GraphQL input, Phase 2 runs the single DB
// call in try/catch. `itemId` set → update; absent → insert.
//
// Value fields — `currentValueCents`, `disposalState`, `disposedAt` — are
// *not* editable through this mutation. Those are owned by `itemReprice`
// and `itemDispose` so the journal / disposal-state semantics stay
// consistent (a manual `currentValueCents` write would silently orphan the
// valuations journal).
export async function itemUpsert(
    userId: string,
    args: GqlSAdminMutationItemUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSItem> {
    const { input } = args;
    const now = new Date();

    try {
        if (input.itemId) {
            const [updated] = await serverRuntime.db
                .update(items)
                .set({
                    categoryKey: input.categoryKey,
                    name: input.name,
                    brand: input.brand ?? null,
                    model: input.model ?? null,
                    serialNumber: input.serialNumber ?? null,
                    purchasedAt: input.purchasedAt ?? null,
                    purchasePriceCents: input.purchasePriceCents ?? null,
                    condition: input.condition ?? null,
                    warrantyEndsAt: input.warrantyEndsAt ?? null,
                    warrantyProvider: input.warrantyProvider ?? null,
                    warrantyNotes: input.warrantyNotes ?? null,
                    notes: input.notes ?? null,
                    updatedAt: now,
                })
                .where(eq(items.itemId, input.itemId))
                .returning();
            if (!updated) throw new Error(`itemUpsert: row ${input.itemId} not found`);
            await serverRuntime.publish.userUpdates({ userId });
            return toGqlItem(updated);
        }

        const payload: ItemCreate = {
            itemId: crypto.randomUUID(),
            categoryKey: input.categoryKey,
            name: input.name,
            brand: input.brand ?? null,
            model: input.model ?? null,
            serialNumber: input.serialNumber ?? null,
            purchasedAt: input.purchasedAt ?? null,
            purchasePriceCents: input.purchasePriceCents ?? null,
            // Seed the cached current value with the purchase price so the
            // "material net worth" number is non-zero from the first save.
            // The first repricing overwrites it.
            currentValueCents: input.purchasePriceCents ?? null,
            condition: input.condition ?? null,
            disposalState: 'owned',
            disposedAt: null,
            warrantyEndsAt: input.warrantyEndsAt ?? null,
            warrantyProvider: input.warrantyProvider ?? null,
            warrantyNotes: input.warrantyNotes ?? null,
            notes: input.notes ?? null,
            updatedAt: now,
        };
        const [inserted] = await serverRuntime.db.insert(items).values(payload).returning();
        if (!inserted) throw new Error('itemUpsert: insert returned no rows');
        await serverRuntime.publish.userUpdates({ userId });
        return toGqlItem(inserted);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
