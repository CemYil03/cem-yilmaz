import type { Recipe } from '../db/schema';
import type { GqlSRecipe } from '../graphql/generated';

export function toGqlRecipe(row: Recipe): GqlSRecipe {
    return {
        recipeId: row.recipeId,
        title: row.title,
        mealType: row.mealType,
        ingredients: row.ingredients,
        steps: row.steps,
        tags: row.tags,
        isFavorite: row.isFavorite,
        rating: row.rating,
        prepTimeMinutes: row.prepTimeMinutes,
        servings: row.servings,
        sourceUrl: row.sourceUrl,
        notes: row.notes,
        lastMadeAt: row.lastMadeAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
