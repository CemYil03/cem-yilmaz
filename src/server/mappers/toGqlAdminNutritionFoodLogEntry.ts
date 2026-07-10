import type { AdminNutritionFoodLogEntry } from '../db/schema';
import type { GqlSAdminNutritionFoodLogEntry, GqlSAdminNutritionRecipe } from '../graphql/generated';

export function toGqlAdminNutritionFoodLogEntry(
    row: AdminNutritionFoodLogEntry,
    recipe: GqlSAdminNutritionRecipe | null,
): GqlSAdminNutritionFoodLogEntry {
    return {
        logId: row.logId,
        consumedAt: row.consumedAt,
        mealType: row.mealType,
        kind: row.kind,
        description: row.description,
        recipe,
        notes: row.notes,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
