import type { AdminNutritionSupplementNutrient } from '../db/schema';
import type { GqlSAdminNutritionSupplementNutrient } from '../graphql/generated';

export function toGqlAdminNutritionSupplementNutrient(row: AdminNutritionSupplementNutrient): GqlSAdminNutritionSupplementNutrient {
    return {
        nutrientId: row.nutrientId,
        name: row.name,
        amount: row.amount,
        unit: row.unit,
        percentDailyValue: row.percentDailyValue,
        sortOrder: row.sortOrder,
    };
}
