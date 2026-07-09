import { eq } from 'drizzle-orm';
import { financeRecurringCosts } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationFinanceRecurringCostDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Hard delete. Recurring costs are self-contained — no satellites, no FK
// cascades to unwind. `active = false` is the softer alternative the UI
// exposes when a subscription is paused but should stay in the ledger.
export async function financeRecurringCostDelete(
    userId: string,
    args: GqlSAdminMutationFinanceRecurringCostDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(financeRecurringCosts)
            .where(eq(financeRecurringCosts.costId, args.costId))
            .returning({ costId: financeRecurringCosts.costId });
        if (deleted.length === 0) {
            throw new Error(`financeRecurringCostDelete: row ${args.costId} not found`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
