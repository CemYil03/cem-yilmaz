import { and, asc, desc, eq } from 'drizzle-orm';
import { recipes } from '../db/schema';
import type { MealType } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSRecipe, GqlSSession } from '../graphql/generated';
import { toGqlRecipe } from '../mappers/toGqlRecipe';

// The cookbook. Optional filters narrow to one `mealType` and/or to starred
// recipes. Ordered favourites-first, then alphabetically, so the page and the
// agent snapshot both surface the dishes Cem actually reaches for.
export async function adminNutritionRecipeFindMany(
    filter: { mealType: MealType | null; favorite: boolean | null },
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSRecipe[]> {
    try {
        const conditions = [
            filter.mealType ? eq(recipes.mealType, filter.mealType) : undefined,
            filter.favorite === true ? eq(recipes.isFavorite, true) : undefined,
        ].filter((c): c is NonNullable<typeof c> => c !== undefined);

        const rows = await serverRuntime.db
            .select()
            .from(recipes)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(recipes.isFavorite), asc(recipes.title));
        return rows.map(toGqlRecipe);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
