import { eq, inArray } from 'drizzle-orm';
import { foodLogEntries, recipes } from '../db/schema';
import type { FoodLogEntryCreate } from '../db/schema';
import type { GqlSFoodLogEntryInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import type { ServerRuntime } from '../domain/ServerRuntime';

// Batch upsert of diary entries. Every row with a `logId` is updated; every
// row without one is inserted. A referenced `recipeId` is verified in one
// round-trip. `consumedAt` is a `DateTime` scalar (arrives as a JS `Date`) and
// maps straight onto the timestamptz column.
export async function foodLogEntriesUpsert(
    userId: string,
    inputs: readonly GqlSFoodLogEntryInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    const rows = inputs.map((entry) => {
        const logId = entry.logId ?? crypto.randomUUID();
        const payload: FoodLogEntryCreate = {
            logId,
            consumedAt: entry.consumedAt,
            mealType: entry.mealType,
            kind: entry.kind,
            description: entry.description,
            recipeId: entry.recipeId ?? null,
            notes: entry.notes ?? null,
            updatedAt: now,
        };
        return { logId, isUpdate: Boolean(entry.logId), recipeId: entry.recipeId ?? null, payload };
    });

    try {
        const recipeIds = Array.from(new Set(rows.map((row) => row.recipeId).filter((id): id is string => id !== null)));
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.logId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (recipeIds.length > 0) {
                const found = await transaction
                    .select({ recipeId: recipes.recipeId })
                    .from(recipes)
                    .where(inArray(recipes.recipeId, recipeIds));
                if (found.length !== recipeIds.length) {
                    const present = new Set(found.map((row) => row.recipeId));
                    const missing = recipeIds.filter((id) => !present.has(id));
                    throw new Error(`foodLogEntriesUpsert: recipes not found: ${missing.join(', ')}`);
                }
            }
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ logId: foodLogEntries.logId })
                    .from(foodLogEntries)
                    .where(inArray(foodLogEntries.logId, updateIds));
                if (existing.length !== updateIds.length) {
                    const present = new Set(existing.map((row) => row.logId));
                    const missing = updateIds.filter((id) => !present.has(id));
                    throw new Error(`foodLogEntriesUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction.update(foodLogEntries).set(row.payload).where(eq(foodLogEntries.logId, row.logId));
                } else {
                    await transaction.insert(foodLogEntries).values(row.payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.logId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
