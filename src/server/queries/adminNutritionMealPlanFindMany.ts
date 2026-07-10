import { asc, inArray } from 'drizzle-orm';
import { mealPlanEntries, recipes } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMealPlanEntry, GqlSRecipe, GqlSSession } from '../graphql/generated';
import { toGqlMealPlanEntry } from '../mappers/toGqlMealPlanEntry';
import { toGqlRecipe } from '../mappers/toGqlRecipe';

// Every soft-plan slot, ordered by date then meal type. Only filled slots
// exist as rows; the page filters to the visible week client-side (matching
// the args-free seed-and-subscribe posture of travel / medical). Referenced
// recipes are joined in one round-trip so the plan card shows the dish title.
export async function adminNutritionMealPlanFindMany(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMealPlanEntry[]> {
    try {
        const rows = await serverRuntime.db
            .select()
            .from(mealPlanEntries)
            .orderBy(asc(mealPlanEntries.date), asc(mealPlanEntries.mealType), asc(mealPlanEntries.entryId));
        if (rows.length === 0) return [];

        const recipeIds = Array.from(new Set(rows.map((r) => r.recipeId).filter((id): id is string => id !== null)));
        const recipeById = new Map<string, GqlSRecipe>();
        if (recipeIds.length > 0) {
            const recipeRows = await serverRuntime.db.select().from(recipes).where(inArray(recipes.recipeId, recipeIds));
            for (const recipe of recipeRows) recipeById.set(recipe.recipeId, toGqlRecipe(recipe));
        }

        return rows.map((row) => toGqlMealPlanEntry(row, row.recipeId ? (recipeById.get(row.recipeId) ?? null) : null));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
