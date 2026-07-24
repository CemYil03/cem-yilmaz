import { tool } from 'ai';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { supplementNutrients, supplements } from '../db/schema';
import type { AdminNutritionSupplementNutrientCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminNutritionSupplementNutrientInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

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

// Replace a supplement's entire per-serving composition. Call after
// `supplementsUpsert` with the confirmed nutrient rows (usually straight from a
// `supplementResearch` result). Never invent amounts — pass an empty array to
// clear the composition.

const supplementNutrientItemSchema = z.object({
    name: z.string().min(1).max(300).describe('Nutrient / active ingredient, e.g. "Vitamin D3".'),
    amount: z.string().max(100).nullish().describe('Per-serving amount as printed (string tolerates "<1", "trace").'),
    unit: z.string().max(50).nullish().describe('Unit for the amount, e.g. "mg", "g", "IU", "µg".'),
    percentDailyValue: z.number().int().min(0).max(100000).nullish().describe('%DV per serving when stated.'),
});

const toolSupplementNutrientsReplaceInputSchema = z.object({
    supplementId: z.uuid().describe('The supplement whose composition to replace.'),
    nutrients: z
        .array(supplementNutrientItemSchema)
        .describe('The full per-serving composition, in label order. Empty array clears it. Never invent amounts.'),
});

interface NutritionAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolSupplementNutrientsReplace({ serverRuntime, session }: NutritionAgentToolContext) {
    return tool({
        description: [
            'Replace a supplement’s whole per-serving composition with the given nutrient rows (name, amount, unit,',
            '%DV), in label order. Use right after `supplementsUpsert` to store the researched or user-confirmed',
            'composition. Pass an empty `nutrients` array to clear it. Do NOT invent amounts.',
        ].join(' '),
        inputSchema: toolSupplementNutrientsReplaceInputSchema,
        execute: async (input) => {
            const nutrients: GqlSAdminNutritionSupplementNutrientInput[] = input.nutrients.map((nutrient, index) => ({
                name: nutrient.name,
                amount: nutrient.amount ?? null,
                unit: nutrient.unit ?? null,
                percentDailyValue: nutrient.percentDailyValue ?? null,
                sortOrder: index,
            }));
            return adminNutritionSupplementNutrientsReplace(
                requireAdminUserId(session),
                input.supplementId,
                nutrients,
                session,
                serverRuntime,
            );
        },
    });
}
