import type { FoodLogEntry } from '../db/schema';
import type { GqlSFoodLogEntry, GqlSRecipe } from '../graphql/generated';

export function toGqlFoodLogEntry(row: FoodLogEntry, recipe: GqlSRecipe | null): GqlSFoodLogEntry {
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
