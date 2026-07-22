import { eq, sql } from 'drizzle-orm';
import { financeIncomeStreams } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';

// Returns `{ monthlyCents, yearlyCents }` — the two income totals the
// finances overview strip and the Sankey both consume. Same projection as
// expenses over `active = true` rows:
//   monthly = Σ(monthly rows) + Σ(yearly rows) / 12
//   yearly  = Σ(monthly rows) * 12 + Σ(yearly rows)
export async function adminFinancesIncomeCentsFindOne(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<{ monthlyCents: number; yearlyCents: number }> {
    try {
        const [row] = await serverRuntime.db
            .select({
                monthlyCents: sql<number>`COALESCE(SUM(CASE WHEN ${financeIncomeStreams.cadence} = 'monthly' THEN ${financeIncomeStreams.amountCents} ELSE ${financeIncomeStreams.amountCents} / 12 END), 0)::int`,
                yearlyCents: sql<number>`COALESCE(SUM(CASE WHEN ${financeIncomeStreams.cadence} = 'yearly' THEN ${financeIncomeStreams.amountCents} ELSE ${financeIncomeStreams.amountCents} * 12 END), 0)::int`,
            })
            .from(financeIncomeStreams)
            .where(eq(financeIncomeStreams.active, true));
        return {
            monthlyCents: row?.monthlyCents ?? 0,
            yearlyCents: row?.yearlyCents ?? 0,
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
