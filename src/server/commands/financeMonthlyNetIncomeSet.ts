import { adminFinancesSettings } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminFinancesQuery, GqlSAdminMutationFinanceMonthlyNetIncomeSetArgs, GqlSSession } from '../graphql/generated';

// One row per admin, keyed by `userId`. `amountCents = null` clears the
// baseline (the Sankey then falls back to expenses only). Returns the
// `AdminFinancesQuery` shell so the client re-renders the totals in one
// round-trip; per-field resolvers on that shell fill the numbers.
export async function financeMonthlyNetIncomeSet(
    userId: string,
    args: GqlSAdminMutationFinanceMonthlyNetIncomeSetArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminFinancesQuery> {
    const now = new Date();
    try {
        await serverRuntime.db
            .insert(adminFinancesSettings)
            .values({
                userId,
                monthlyNetIncomeCents: args.amountCents ?? null,
                updatedAt: now,
            })
            .onConflictDoUpdate({
                target: adminFinancesSettings.userId,
                set: {
                    monthlyNetIncomeCents: args.amountCents ?? null,
                    updatedAt: now,
                },
            });
        await serverRuntime.publish.userUpdates({ userId });
        return {} as GqlSAdminFinancesQuery;
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
