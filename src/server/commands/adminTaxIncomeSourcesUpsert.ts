import { eq, inArray } from 'drizzle-orm';
import { taxIncomeSources } from '../db/schema';
import type { AdminTaxIncomeSourceCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminTaxIncomeSourceInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch upsert of income sources. Rows with an `incomeSourceId` update, rows
// without insert. `grossAmountCents` coalesces to null (figure not yet known).
// `referenceIds` echoes the id per input row in input order.
export async function adminTaxIncomeSourcesUpsert(
    userId: string,
    inputs: readonly GqlSAdminTaxIncomeSourceInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction.
    const rows = inputs.map((input) => {
        const incomeSourceId = input.incomeSourceId ?? crypto.randomUUID();
        const payload: AdminTaxIncomeSourceCreate = {
            incomeSourceId,
            taxYearId: input.taxYearId,
            kind: input.kind,
            label: input.label,
            grossAmountCents: input.grossAmountCents ?? null,
            notes: input.notes ?? null,
            updatedAt: now,
        };
        return { incomeSourceId, isUpdate: Boolean(input.incomeSourceId), payload };
    });

    // Phase 2 — transactional execution.
    try {
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.incomeSourceId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ incomeSourceId: taxIncomeSources.incomeSourceId })
                    .from(taxIncomeSources)
                    .where(inArray(taxIncomeSources.incomeSourceId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.incomeSourceId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`adminTaxIncomeSourcesUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction
                        .update(taxIncomeSources)
                        .set(row.payload)
                        .where(eq(taxIncomeSources.incomeSourceId, row.incomeSourceId));
                } else {
                    await transaction.insert(taxIncomeSources).values(row.payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.incomeSourceId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
