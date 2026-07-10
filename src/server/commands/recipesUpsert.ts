import { eq, inArray } from 'drizzle-orm';
import { recipes } from '../db/schema';
import type { RecipeCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSRecipeInput, GqlSSession } from '../graphql/generated';

// Batch upsert of cookbook recipes. Every row with a `recipeId` is updated;
// every row without one is inserted. `referenceIds` echoes the id per input
// row in input order.
export async function recipesUpsert(
    userId: string,
    inputs: readonly GqlSRecipeInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    const rows = inputs.map((recipe) => {
        const recipeId = recipe.recipeId ?? crypto.randomUUID();
        const payload: RecipeCreate = {
            recipeId,
            title: recipe.title,
            mealType: recipe.mealType,
            ingredients: recipe.ingredients ?? [],
            steps: recipe.steps ?? null,
            tags: recipe.tags ?? [],
            isFavorite: recipe.isFavorite ?? false,
            rating: recipe.rating ?? null,
            prepTimeMinutes: recipe.prepTimeMinutes ?? null,
            servings: recipe.servings ?? null,
            sourceUrl: recipe.sourceUrl ?? null,
            notes: recipe.notes ?? null,
            lastMadeAt: recipe.lastMadeAt ?? null,
            updatedAt: now,
        };
        return { recipeId, isUpdate: Boolean(recipe.recipeId), payload };
    });

    try {
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.recipeId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ recipeId: recipes.recipeId })
                    .from(recipes)
                    .where(inArray(recipes.recipeId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.recipeId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`recipesUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction.update(recipes).set(row.payload).where(eq(recipes.recipeId, row.recipeId));
                } else {
                    await transaction.insert(recipes).values(row.payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.recipeId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
