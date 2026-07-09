import { and, asc, eq, isNotNull, lte } from 'drizzle-orm';
import { items } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSItem, GqlSSession } from '../graphql/generated';
import { toGqlItem } from '../mappers/toGqlItem';

// Items whose warranty ends within the given window (default 90 days),
// ordered so the soonest expirations come first. Scoped to currently-owned
// rows — a warranty on something already sold is not actionable. The upper
// bound is inclusive; already-expired warranties are included (they sit on
// top with negative days remaining) because "expired last week" is exactly
// the thing a warranty widget should flag.
export async function adminInventoryItemUpcomingWarrantyFindMany(
    withinDays: number,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSItem[]> {
    try {
        const cutoff = new Date();
        cutoff.setUTCHours(23, 59, 59, 999);
        cutoff.setUTCDate(cutoff.getUTCDate() + withinDays);
        const cutoffIso = cutoff.toISOString().slice(0, 10);
        const rows = await serverRuntime.db
            .select()
            .from(items)
            .where(and(eq(items.disposalState, 'owned'), isNotNull(items.warrantyEndsAt), lte(items.warrantyEndsAt, cutoffIso)))
            .orderBy(asc(items.warrantyEndsAt));
        return rows.map(toGqlItem);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
