import { eq, inArray } from 'drizzle-orm';
import { mealPlanEntries, recipes } from '../db/schema';
import type { MealPlanEntryCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMealPlanEntryInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch upsert of soft-plan slots. Every row with an `entryId` is updated;
// every row without one is inserted. A referenced `recipeId` is verified in
// one round-trip so a hallucinated id fails the transaction rather than
// nulling silently. The `date` scalar is a `YYYY-MM-DD` string, matching the
// string-mode `date` column directly.
export async function mealPlanEntriesUpsert(
    userId: string,
    inputs: readonly GqlSMealPlanEntryInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    const rows = inputs.map((entry) => {
        const entryId = entry.entryId ?? crypto.randomUUID();
        const payload: MealPlanEntryCreate = {
            entryId,
            date: entry.date,
            mealType: entry.mealType,
            recipeId: entry.recipeId ?? null,
            customText: entry.customText ?? null,
            notes: entry.notes ?? null,
            updatedAt: now,
        };
        return { entryId, isUpdate: Boolean(entry.entryId), recipeId: entry.recipeId ?? null, payload };
    });

    try {
        const recipeIds = Array.from(new Set(rows.map((row) => row.recipeId).filter((id): id is string => id !== null)));
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.entryId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (recipeIds.length > 0) {
                const found = await transaction
                    .select({ recipeId: recipes.recipeId })
                    .from(recipes)
                    .where(inArray(recipes.recipeId, recipeIds));
                if (found.length !== recipeIds.length) {
                    const present = new Set(found.map((row) => row.recipeId));
                    const missing = recipeIds.filter((id) => !present.has(id));
                    throw new Error(`mealPlanEntriesUpsert: recipes not found: ${missing.join(', ')}`);
                }
            }
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ entryId: mealPlanEntries.entryId })
                    .from(mealPlanEntries)
                    .where(inArray(mealPlanEntries.entryId, updateIds));
                if (existing.length !== updateIds.length) {
                    const present = new Set(existing.map((row) => row.entryId));
                    const missing = updateIds.filter((id) => !present.has(id));
                    throw new Error(`mealPlanEntriesUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction.update(mealPlanEntries).set(row.payload).where(eq(mealPlanEntries.entryId, row.entryId));
                } else {
                    await transaction.insert(mealPlanEntries).values(row.payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.entryId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
