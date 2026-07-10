import type { AdminNutritionSupplement, AdminNutritionSupplementNutrient } from '../db/schema';
import type { GqlSAdminNutritionSupplement } from '../graphql/generated';
import { toGqlAdminNutritionSupplementNutrient } from './toGqlAdminNutritionSupplementNutrient';

// `nutrients` are passed in already ordered by `sortOrder` (the query fetches
// them that way) — the mapper just maps them across.
export function toGqlAdminNutritionSupplement(
    row: AdminNutritionSupplement,
    nutrients: readonly AdminNutritionSupplementNutrient[],
): GqlSAdminNutritionSupplement {
    return {
        supplementId: row.supplementId,
        name: row.name,
        brand: row.brand,
        servingSize: row.servingSize,
        servingsPerContainer: row.servingsPerContainer,
        sourceUrl: row.sourceUrl,
        notes: row.notes,
        researchedAt: row.researchedAt,
        nutrients: nutrients.map(toGqlAdminNutritionSupplementNutrient),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
