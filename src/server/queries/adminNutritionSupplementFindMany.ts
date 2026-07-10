import { asc, inArray } from 'drizzle-orm';
import { supplementNutrients, supplements } from '../db/schema';
import type { SupplementNutrient } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSupplement, GqlSSession } from '../graphql/generated';
import { toGqlSupplement } from '../mappers/toGqlSupplement';

// Every tracked supplement, ordered by name, each with its per-serving nutrient
// rows joined in one round-trip and ordered by `sortOrder` (the label order).
export async function adminNutritionSupplementFindMany(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSSupplement[]> {
    try {
        const rows = await serverRuntime.db.select().from(supplements).orderBy(asc(supplements.name), asc(supplements.supplementId));
        if (rows.length === 0) return [];

        const ids = rows.map((row) => row.supplementId);
        const nutrientRows = await serverRuntime.db
            .select()
            .from(supplementNutrients)
            .where(inArray(supplementNutrients.supplementId, ids))
            .orderBy(asc(supplementNutrients.sortOrder), asc(supplementNutrients.nutrientId));

        const nutrientsBySupplement = new Map<string, SupplementNutrient[]>();
        for (const nutrient of nutrientRows) {
            const list = nutrientsBySupplement.get(nutrient.supplementId) ?? [];
            list.push(nutrient);
            nutrientsBySupplement.set(nutrient.supplementId, list);
        }

        return rows.map((row) => toGqlSupplement(row, nutrientsBySupplement.get(row.supplementId) ?? []));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
