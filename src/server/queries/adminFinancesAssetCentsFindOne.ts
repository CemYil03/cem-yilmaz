import { and, eq, sql } from 'drizzle-orm';
import { financeAssets } from '../db/schema';
import type { AdminFinancesAssetKind } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';

// Sum of `currentValueCents` over active assets of one kind (or all kinds when
// `kind` is omitted). Drives the Overview strip liquid / invested / bauspar /
// financial-net-worth tiles. Inactive rows are excluded so pausing an asset
// drops it from the totals without a hard delete.
export async function adminFinancesAssetCentsFindOne(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
    kind?: AdminFinancesAssetKind,
): Promise<number> {
    try {
        const where = kind ? and(eq(financeAssets.active, true), eq(financeAssets.kind, kind)) : eq(financeAssets.active, true);
        const [row] = await serverRuntime.db
            .select({ total: sql<number>`COALESCE(SUM(${financeAssets.currentValueCents}), 0)::int` })
            .from(financeAssets)
            .where(where);
        return row?.total ?? 0;
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
