import { asc } from 'drizzle-orm';
import { financeRecurringCosts } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminFinancesRecurringCost, GqlSSession } from '../graphql/generated';
import { toGqlAdminFinancesRecurringCost } from '../mappers/toGqlAdminFinancesRecurringCost';

// Lists every recurring cost (active and inactive). The page groups by
// `categoryKey` on render, so ordering by category first keeps the list
// visually stable across a mutation; `name ASC` breaks the tie inside a
// group.
export async function adminFinancesRecurringCostFindMany(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminFinancesRecurringCost[]> {
    try {
        const rows = await serverRuntime.db
            .select()
            .from(financeRecurringCosts)
            .orderBy(asc(financeRecurringCosts.categoryKey), asc(financeRecurringCosts.name));
        return rows.map(toGqlAdminFinancesRecurringCost);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
