import { eq } from 'drizzle-orm';
import { supplementNutrients, supplements } from '../db/schema';
import type { AdminNutritionSupplementNutrientCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSAdminNutritionSupplementNutrientInput, GqlSSession } from '../graphql/generated';

// Replace one supplement's entire per-serving composition. Deletes the existing
// `SupplementNutrients` rows for the parent and inserts the new set with
// `sortOrder` = array index (unless the input supplies one) in a single
// transaction. Kept separate from `adminNutritionSupplementsUpsert` because the codegen's
// validation-schema plugin can't emit a nested input-array without breaking its
// own `Properties<T>` type — the same reason travel / inventory split parent and
// child writes into sibling batch mutations.
export async function adminNutritionSupplementNutrientsReplace(
    userId: string,
    supplementId: string,
    nutrientInputs: readonly GqlSAdminNutritionSupplementNutrientInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();
    const payloads: AdminNutritionSupplementNutrientCreate[] = nutrientInputs.map((nutrient, index) => ({
        nutrientId: crypto.randomUUID(),
        supplementId,
        name: nutrient.name,
        amount: nutrient.amount ?? null,
        unit: nutrient.unit ?? null,
        percentDailyValue: nutrient.percentDailyValue ?? null,
        sortOrder: nutrient.sortOrder ?? index,
        updatedAt: now,
    }));

    try {
        await serverRuntime.db.transaction(async (transaction) => {
            const [parent] = await transaction
                .select({ supplementId: supplements.supplementId })
                .from(supplements)
                .where(eq(supplements.supplementId, supplementId));
            if (!parent) {
                throw new Error(`adminNutritionSupplementNutrientsReplace: supplement not found: ${supplementId}`);
            }
            await transaction.delete(supplementNutrients).where(eq(supplementNutrients.supplementId, supplementId));
            if (payloads.length > 0) {
                await transaction.insert(supplementNutrients).values(payloads);
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: supplementId, referenceIds: payloads.map((payload) => payload.nutrientId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
