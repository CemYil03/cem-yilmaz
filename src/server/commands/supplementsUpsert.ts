import { eq, inArray } from 'drizzle-orm';
import { supplements } from '../db/schema';
import type { SupplementCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSupplementInput, GqlSSession } from '../graphql/generated';

// Batch upsert of supplement rows (the parent record only — nutrient rows are
// written separately via `supplementNutrientsReplace`, mirroring the
// parent/child split travel and inventory use). Every row with a
// `supplementId` is updated; every row without one is inserted. `referenceIds`
// echoes the supplement id per input row in input order.
export async function supplementsUpsert(
    userId: string,
    inputs: readonly GqlSSupplementInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    const rows = inputs.map((input) => {
        const supplementId = input.supplementId ?? crypto.randomUUID();
        const payload: SupplementCreate = {
            supplementId,
            name: input.name,
            brand: input.brand ?? null,
            servingSize: input.servingSize ?? null,
            servingsPerContainer: input.servingsPerContainer ?? null,
            sourceUrl: input.sourceUrl ?? null,
            notes: input.notes ?? null,
            researchedAt: input.researchedAt ?? null,
            updatedAt: now,
        };
        return { supplementId, isUpdate: Boolean(input.supplementId), payload };
    });

    try {
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.supplementId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ supplementId: supplements.supplementId })
                    .from(supplements)
                    .where(inArray(supplements.supplementId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.supplementId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`supplementsUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction.update(supplements).set(row.payload).where(eq(supplements.supplementId, row.supplementId));
                } else {
                    await transaction.insert(supplements).values(row.payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.supplementId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
