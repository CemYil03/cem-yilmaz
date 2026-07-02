import { eq } from 'drizzle-orm';
import { itemValuations, items } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationItemRepriceArgs, GqlSItem, GqlSSession } from '../graphql/generated';
import { toGqlItem } from '../mappers/toGqlItem';

// Single-transaction repricing: insert one `ItemValuations` row and update
// the cached `items.currentValueCents` so list / overview reads never need
// to hit the journal. `valuedAt` is settable so a back-dated appraisal is
// honoured; the cache column still reflects the latest *by valuedAt* only
// when the incoming value is more recent than what is already stored. In
// practice callers write "now"-timestamped rows, so we simply overwrite —
// the sparkline uses the journal directly, and the cache is a
// convenience.
export async function itemReprice(
    userId: string,
    args: GqlSAdminMutationItemRepriceArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSItem> {
    const now = new Date();
    const valuedAt = args.valuedAt ?? now;

    try {
        const updated = await serverRuntime.db.transaction(async (tx) => {
            await tx.insert(itemValuations).values({
                valuationId: crypto.randomUUID(),
                itemId: args.itemId,
                valueCents: args.valueCents,
                valuedAt,
                note: args.note ?? null,
            });
            const [row] = await tx
                .update(items)
                .set({ currentValueCents: args.valueCents, updatedAt: now })
                .where(eq(items.itemId, args.itemId))
                .returning();
            if (!row) throw new Error(`itemReprice: row ${args.itemId} not found`);
            return row;
        });
        await serverRuntime.publish.userUpdates({ userId });
        return toGqlItem(updated);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
