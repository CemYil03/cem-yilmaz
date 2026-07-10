import type { MealPlanEntry } from '../db/schema';
import type { GqlSMealPlanEntry, GqlSRecipe } from '../graphql/generated';

// The loading query owns the recipe join and passes the hydrated recipe (or
// null) in — same shape as `toGqlAdminTravelTrip` receiving its days.
export function toGqlMealPlanEntry(row: MealPlanEntry, recipe: GqlSRecipe | null): GqlSMealPlanEntry {
    return {
        entryId: row.entryId,
        date: row.date,
        mealType: row.mealType,
        recipe,
        customText: row.customText,
        notes: row.notes,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
