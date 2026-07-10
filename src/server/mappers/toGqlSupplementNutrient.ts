import type { SupplementNutrient } from '../db/schema';
import type { GqlSSupplementNutrient } from '../graphql/generated';

export function toGqlSupplementNutrient(row: SupplementNutrient): GqlSSupplementNutrient {
    return {
        nutrientId: row.nutrientId,
        name: row.name,
        amount: row.amount,
        unit: row.unit,
        percentDailyValue: row.percentDailyValue,
        sortOrder: row.sortOrder,
    };
}
