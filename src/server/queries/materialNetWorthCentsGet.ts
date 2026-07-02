import { and, eq, sql } from 'drizzle-orm';
import { items } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';

// Sum of `currentValueCents` over currently-owned items. Null column values
// count as 0 (via `COALESCE`). Drives the overview strip on the inventory
// page and — once wired — the future finances-page cross-reference tile.
// Sold / gifted / lost / disposed rows are excluded so a disposal actually
// reduces the number.
export async function materialNetWorthCentsGet(requestingSession: GqlSSession, serverRuntime: ServerRuntime): Promise<number> {
    try {
        const [row] = await serverRuntime.db
            .select({ total: sql<number>`COALESCE(SUM(${items.currentValueCents}), 0)::int` })
            .from(items)
            .where(and(eq(items.disposalState, 'owned')));
        return row?.total ?? 0;
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
