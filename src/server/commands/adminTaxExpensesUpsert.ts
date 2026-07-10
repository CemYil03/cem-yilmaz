import { eq, inArray } from 'drizzle-orm';
import { taxExpenses } from '../db/schema';
import type { AdminTaxExpenseCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminTaxExpenseInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch upsert of deductible expenses. Rows with an `expenseId` update, rows
// without insert. `deductible` defaults to true; `incomeSourceId` / `incurredOn`
// coalesce to null. `referenceIds` echoes the id per input row in input order.
export async function adminTaxExpensesUpsert(
    userId: string,
    inputs: readonly GqlSAdminTaxExpenseInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction.
    const rows = inputs.map((input) => {
        const expenseId = input.expenseId ?? crypto.randomUUID();
        const payload: AdminTaxExpenseCreate = {
            expenseId,
            taxYearId: input.taxYearId,
            incomeSourceId: input.incomeSourceId ?? null,
            categoryKey: input.categoryKey,
            description: input.description,
            amountCents: input.amountCents,
            incurredOn: input.incurredOn ?? null,
            deductible: input.deductible ?? true,
            notes: input.notes ?? null,
            updatedAt: now,
        };
        return { expenseId, isUpdate: Boolean(input.expenseId), payload };
    });

    // Phase 2 — transactional execution.
    try {
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.expenseId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ expenseId: taxExpenses.expenseId })
                    .from(taxExpenses)
                    .where(inArray(taxExpenses.expenseId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.expenseId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`adminTaxExpensesUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction.update(taxExpenses).set(row.payload).where(eq(taxExpenses.expenseId, row.expenseId));
                } else {
                    await transaction.insert(taxExpenses).values(row.payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.expenseId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
