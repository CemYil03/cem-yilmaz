import { eq, inArray } from 'drizzle-orm';
import { financeRecurringCosts } from '../db/schema';
import type { FinanceRecurringCostCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSFinanceRecurringCostInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch upsert of recurring costs. Every row with a `costId` is updated;
// every row without one is inserted under a freshly-minted UUID. The whole
// batch runs inside a single transaction so a failure anywhere rolls the
// batch back — nothing lands half-written. Optional-in-GraphQL fields
// (`currency`, `active`, `notes`, `startsOn`, `endsOn`) coalesce to their
// column defaults or null so a partial payload from the "New cost" dialog
// produces a sensible row. `referenceIds` echoes the id per input row (in
// input order) so the caller can address newly-created rows without a
// follow-up read.
export async function financeRecurringCostsUpsert(
    userId: string,
    inputs: readonly GqlSFinanceRecurringCostInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction.
    const rows = inputs.map((input) => {
        const costId = input.costId ?? crypto.randomUUID();
        const payload: FinanceRecurringCostCreate = {
            costId,
            name: input.name,
            categoryKey: input.categoryKey,
            amountCents: input.amountCents,
            cadence: input.cadence,
            currency: input.currency ?? 'EUR',
            notes: input.notes ?? null,
            active: input.active ?? true,
            startsOn: input.startsOn ?? null,
            endsOn: input.endsOn ?? null,
            updatedAt: now,
        };
        return { costId, isUpdate: Boolean(input.costId), payload };
    });

    // Phase 2 — transactional execution.
    try {
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.costId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ costId: financeRecurringCosts.costId })
                    .from(financeRecurringCosts)
                    .where(inArray(financeRecurringCosts.costId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.costId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`financeRecurringCostsUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction.update(financeRecurringCosts).set(row.payload).where(eq(financeRecurringCosts.costId, row.costId));
                } else {
                    await transaction.insert(financeRecurringCosts).values(row.payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.costId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
