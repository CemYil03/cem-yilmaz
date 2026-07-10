import { asc, inArray } from 'drizzle-orm';
import { supplementNutrients, supplements } from '../db/schema';
import type { AdminNutritionSupplementNutrient } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminNutritionSupplement, GqlSSession } from '../graphql/generated';
import { toGqlAdminNutritionSupplement } from '../mappers/toGqlAdminNutritionSupplement';

// Every tracked supplement, ordered by name, each with its per-serving nutrient
// rows joined in one round-trip and ordered by `sortOrder` (the label order).
export async function adminNutritionSupplementFindMany(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminNutritionSupplement[]> {
    try {
        const rows = await serverRuntime.db.select().from(supplements).orderBy(asc(supplements.name), asc(supplements.supplementId));
        if (rows.length === 0) return [];

        const ids = rows.map((row) => row.supplementId);
        const nutrientRows = await serverRuntime.db
            .select()
            .from(supplementNutrients)
            .where(inArray(supplementNutrients.supplementId, ids))
            .orderBy(asc(supplementNutrients.sortOrder), asc(supplementNutrients.nutrientId));

        const nutrientsBySupplement = new Map<string, AdminNutritionSupplementNutrient[]>();
        for (const nutrient of nutrientRows) {
            const list = nutrientsBySupplement.get(nutrient.supplementId) ?? [];
            list.push(nutrient);
            nutrientsBySupplement.set(nutrient.supplementId, list);
        }

        return rows.map((row) => toGqlAdminNutritionSupplement(row, nutrientsBySupplement.get(row.supplementId) ?? []));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
