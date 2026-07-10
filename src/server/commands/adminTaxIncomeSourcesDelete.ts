import { inArray } from 'drizzle-orm';
import { taxIncomeSources } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch hard delete of income sources. Linked `taxExpenses.incomeSourceId` are
// nulled via the FK (the expense survives). `referenceIds` echoes the deleted
// ids in input order — an id that never existed makes the batch throw.
export async function adminTaxIncomeSourcesDelete(
    userId: string,
    incomeSourceIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(taxIncomeSources)
            .where(inArray(taxIncomeSources.incomeSourceId, incomeSourceIds as string[]))
            .returning({ incomeSourceId: taxIncomeSources.incomeSourceId });
        if (deleted.length !== incomeSourceIds.length) {
            const found = new Set(deleted.map((row) => row.incomeSourceId));
            const missing = incomeSourceIds.filter((id) => !found.has(id));
            throw new Error(`adminTaxIncomeSourcesDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...incomeSourceIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
