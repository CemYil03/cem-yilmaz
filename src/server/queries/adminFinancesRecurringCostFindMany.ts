import { asc } from 'drizzle-orm';
import { financeRecurringCosts } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSFinanceRecurringCost, GqlSSession } from '../graphql/generated';
import { toGqlFinanceRecurringCost } from '../mappers/toGqlFinanceRecurringCost';

// Lists every recurring cost (active and inactive). The page groups by
// `categoryKey` on render, so ordering by category first keeps the list
// visually stable across a mutation; `name ASC` breaks the tie inside a
// group.
export async function adminFinancesRecurringCostFindMany(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSFinanceRecurringCost[]> {
    try {
        const rows = await serverRuntime.db
            .select()
            .from(financeRecurringCosts)
            .orderBy(asc(financeRecurringCosts.categoryKey), asc(financeRecurringCosts.name));
        return rows.map(toGqlFinanceRecurringCost);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
