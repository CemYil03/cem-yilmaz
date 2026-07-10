import { desc, inArray } from 'drizzle-orm';
import { foodLogEntries, recipes } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminNutritionFoodLogEntry, GqlSAdminNutritionRecipe, GqlSSession } from '../graphql/generated';
import { toGqlAdminNutritionFoodLogEntry } from '../mappers/toGqlAdminNutritionFoodLogEntry';
import { toGqlAdminNutritionRecipe } from '../mappers/toGqlAdminNutritionRecipe';

// Every diary entry, newest first. The page filters to the visible week and
// rolls up the end-of-week overview client-side (matching the args-free
// seed-and-subscribe posture of travel / medical). Referenced recipes are
// joined in one round-trip.
export async function adminNutritionFoodLogFindMany(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminNutritionFoodLogEntry[]> {
    try {
        const rows = await serverRuntime.db
            .select()
            .from(foodLogEntries)
            .orderBy(desc(foodLogEntries.consumedAt), desc(foodLogEntries.logId));
        if (rows.length === 0) return [];

        const recipeIds = Array.from(new Set(rows.map((r) => r.recipeId).filter((id): id is string => id !== null)));
        const recipeById = new Map<string, GqlSAdminNutritionRecipe>();
        if (recipeIds.length > 0) {
            const recipeRows = await serverRuntime.db.select().from(recipes).where(inArray(recipes.recipeId, recipeIds));
            for (const recipe of recipeRows) recipeById.set(recipe.recipeId, toGqlAdminNutritionRecipe(recipe));
        }

        return rows.map((row) => toGqlAdminNutritionFoodLogEntry(row, row.recipeId ? (recipeById.get(row.recipeId) ?? null) : null));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
