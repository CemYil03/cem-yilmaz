import { eq, sql } from 'drizzle-orm';
import { financeRecurringCosts } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';

// Returns `{ monthlyCents, yearlyCents }` — the two totals the finances
// overview strip and the Sankey both consume. Computed in one SQL pass over
// `active = true` rows:
//   monthly = Σ(monthly rows) + Σ(yearly rows) / 12
//   yearly  = Σ(monthly rows) * 12 + Σ(yearly rows)
// The `/12` uses integer division on purpose — half a cent of drift on a
// yearly line rendered monthly is fine, and it keeps the numbers integer
// end-to-end so the UI never has to reason about float rounding.
export async function adminFinancesExpensesCentsFindOne(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<{ monthlyCents: number; yearlyCents: number }> {
    try {
        const [row] = await serverRuntime.db
            .select({
                monthlyCents: sql<number>`COALESCE(SUM(CASE WHEN ${financeRecurringCosts.cadence} = 'monthly' THEN ${financeRecurringCosts.amountCents} ELSE ${financeRecurringCosts.amountCents} / 12 END), 0)::int`,
                yearlyCents: sql<number>`COALESCE(SUM(CASE WHEN ${financeRecurringCosts.cadence} = 'yearly' THEN ${financeRecurringCosts.amountCents} ELSE ${financeRecurringCosts.amountCents} * 12 END), 0)::int`,
            })
            .from(financeRecurringCosts)
            .where(eq(financeRecurringCosts.active, true));
        return {
            monthlyCents: row?.monthlyCents ?? 0,
            yearlyCents: row?.yearlyCents ?? 0,
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
