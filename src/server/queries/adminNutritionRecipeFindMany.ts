import { and, asc, desc, eq } from 'drizzle-orm';
import { recipes } from '../db/schema';
import type { AdminNutritionMealType } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminNutritionRecipe, GqlSSession } from '../graphql/generated';
import { toGqlAdminNutritionRecipe } from '../mappers/toGqlAdminNutritionRecipe';

// The cookbook. Optional filters narrow to one `mealType` and/or to starred
// recipes. Ordered favourites-first, then alphabetically, so the page and the
// agent snapshot both surface the dishes Cem actually reaches for.
export async function adminNutritionRecipeFindMany(
    filter: { mealType: AdminNutritionMealType | null; favorite: boolean | null },
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminNutritionRecipe[]> {
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
        return rows.map(toGqlAdminNutritionRecipe);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
