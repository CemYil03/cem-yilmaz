import { eq, sql } from 'drizzle-orm';
import { financeRecurringCosts } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';

// Returns `{ monthlyCents, quarterlyCents, yearlyCents }` — the three totals
// the finances overview strip and the Sankey both consume. Computed in one
// SQL pass over `active = true` rows. Projection is via a yearly base so
// monthly ↔ quarterly ↔ yearly stays integer-clean:
//   yearly    = Σ(monthly)×12 + Σ(quarterly)×4 + Σ(yearly)
//   monthly   = yearly / 12  (per-row CASE; integer division)
//   quarterly = yearly / 4
// The `/N` uses integer division on purpose — half a cent of drift on a
// yearly line rendered monthly is fine, and it keeps the numbers integer
// end-to-end so the UI never has to reason about float rounding.
export async function adminFinancesExpensesCentsFindOne(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<{ monthlyCents: number; quarterlyCents: number; yearlyCents: number }> {
    try {
        const amount = financeRecurringCosts.amountCents;
        const cadence = financeRecurringCosts.cadence;
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
            .from(financeRecurringCosts)
            .where(eq(financeRecurringCosts.active, true));
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
