import { eq, sql } from 'drizzle-orm';
import { financeIncomeStreams } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';

// Returns `{ monthlyCents, quarterlyCents, yearlyCents }` — the three income
// totals the finances overview strip and the Sankey both consume. Same
// projection as expenses over `active = true` rows — see
// `adminFinancesExpensesCentsFindOne` for the CASE shape.
export async function adminFinancesIncomeCentsFindOne(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<{ monthlyCents: number; quarterlyCents: number; yearlyCents: number }> {
    try {
        const amount = financeIncomeStreams.amountCents;
        const cadence = financeIncomeStreams.cadence;
        const [row] = await serverRuntime.db
            .select({
                monthlyCents: sql<number>`COALESCE(SUM(CASE
                    WHEN ${cadence} = 'monthly' THEN ${amount}
                    WHEN ${cadence} = 'quarterly' THEN ${amount} / 3
                    ELSE ${amount} / 12
                END), 0)::int`,
                quarterlyCents: sql<number>`COALESCE(SUM(CASE
                    WHEN ${cadence} = 'quarterly' THEN ${amount}
                    WHEN ${cadence} = 'monthly' THEN ${amount} * 3
                    ELSE ${amount} / 4
                END), 0)::int`,
                yearlyCents: sql<number>`COALESCE(SUM(CASE
                    WHEN ${cadence} = 'yearly' THEN ${amount}
                    WHEN ${cadence} = 'quarterly' THEN ${amount} * 4
                    ELSE ${amount} * 12
                END), 0)::int`,
            })
            .from(financeIncomeStreams)
            .where(eq(financeIncomeStreams.active, true));
        return {
            monthlyCents: row?.monthlyCents ?? 0,
            quarterlyCents: row?.quarterlyCents ?? 0,
            yearlyCents: row?.yearlyCents ?? 0,
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
