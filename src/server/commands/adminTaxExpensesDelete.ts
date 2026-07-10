import { inArray } from 'drizzle-orm';
import { taxExpenses } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch hard delete of expenses. Attached `taxFiles.expenseId` are nulled via
// the FK (the file stays on the year). `referenceIds` echoes the deleted ids
// in input order — an id that never existed makes the batch throw.
export async function adminTaxExpensesDelete(
    userId: string,
    expenseIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(taxExpenses)
            .where(inArray(taxExpenses.expenseId, expenseIds as string[]))
            .returning({ expenseId: taxExpenses.expenseId });
        if (deleted.length !== expenseIds.length) {
            const found = new Set(deleted.map((row) => row.expenseId));
            const missing = expenseIds.filter((id) => !found.has(id));
            throw new Error(`adminTaxExpensesDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...expenseIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
