import type { Supplement, SupplementNutrient } from '../db/schema';
import type { GqlSSupplement } from '../graphql/generated';
import { toGqlSupplementNutrient } from './toGqlSupplementNutrient';

// `nutrients` are passed in already ordered by `sortOrder` (the query fetches
// them that way) — the mapper just maps them across.
export function toGqlSupplement(row: Supplement, nutrients: readonly SupplementNutrient[]): GqlSSupplement {
    return {
        supplementId: row.supplementId,
        name: row.name,
        brand: row.brand,
        servingSize: row.servingSize,
        servingsPerContainer: row.servingsPerContainer,
        sourceUrl: row.sourceUrl,
        notes: row.notes,
        researchedAt: row.researchedAt,
        nutrients: nutrients.map(toGqlSupplementNutrient),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
