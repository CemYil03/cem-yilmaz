import { tool } from 'ai';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { supplements } from '../db/schema';
import type { AdminNutritionSupplementCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSAdminNutritionSupplementInput, GqlSSession } from '../graphql/generated';

// Batch upsert of supplement rows (the parent record only — nutrient rows are
// written separately via `adminNutritionSupplementNutrientsReplace`, mirroring the
// parent/child split travel and inventory use). Every row with a
// `supplementId` is updated; every row without one is inserted. `referenceIds`
// echoes the supplement id per input row in input order.
export async function adminNutritionSupplementsUpsert(
    userId: string,
    inputs: readonly GqlSAdminNutritionSupplementInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    const rows = inputs.map((input) => {
        const supplementId = input.supplementId ?? crypto.randomUUID();
        const payload: AdminNutritionSupplementCreate = {
            supplementId,
            name: input.name,
            brand: input.brand ?? null,
            servingSize: input.servingSize ?? null,
            servingsPerContainer: input.servingsPerContainer ?? null,
            sourceUrl: input.sourceUrl ?? null,
            notes: input.notes ?? null,
            researchedAt: input.researchedAt ?? null,
            updatedAt: now,
        };
        return { supplementId, isUpdate: Boolean(input.supplementId), payload };
    });

    try {
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.supplementId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ supplementId: supplements.supplementId })
                    .from(supplements)
                    .where(inArray(supplements.supplementId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.supplementId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`adminNutritionSupplementsUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction.update(supplements).set(row.payload).where(eq(supplements.supplementId, row.supplementId));
                } else {
                    await transaction.insert(supplements).values(row.payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.supplementId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

// Batch create-or-edit of the supplement record (parent row only — the
// per-serving nutrient rows are written by `supplementNutrientsReplace`).
// Hand-built schema so `researchedAt` rides the wire as an ISO string (Gemini's
// structured output rejects `z.date()` — same rationale as `toolRecipesUpsert`).

const supplementItemSchema = z.object({
    supplementId: z.uuid().nullish().describe('Omit (or null) to create a new supplement. Pass an existing id to edit.'),
    name: z.string().min(1).max(300).describe('AdminNutritionSupplement / product name.'),
    brand: z.string().max(300).nullish().describe('Manufacturer / brand.'),
    servingSize: z.string().max(300).nullish().describe('Serving size as printed, e.g. "2 capsules" or "1 scoop (5 g)".'),
    servingsPerContainer: z.number().int().min(0).max(100000).nullish(),
    sourceUrl: z.string().max(2000).nullish().describe('Product page the composition came from.'),
    notes: z.string().max(4000).nullish(),
    researchedAt: z
        .string()
        .nullish()
        .describe('ISO-8601 timestamp. Set to now when the composition came from `supplementResearch`; omit otherwise.'),
});

const toolSupplementsUpsertInputSchema = z.object({
    supplements: z
        .array(supplementItemSchema)
        .min(1)
        .describe('One or more supplements to create or edit. One-element array for a single edit.'),
});

interface NutritionAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolSupplementsUpsert({ serverRuntime, session }: NutritionAgentToolContext) {
    return tool({
        description: [
            'Batch create-or-edit of supplement records (parent row: name, brand, serving info, notes). Every row',
            'with a `supplementId` is updated; every row without one is inserted. Returns `referenceIds` in input',
            'order — pass the new id straight into `supplementNutrientsReplace` to write the composition.',
        ].join(' '),
        inputSchema: toolSupplementsUpsertInputSchema,
        execute: async (input) => {
            const inputs: GqlSAdminNutritionSupplementInput[] = input.supplements.map((supplement) => ({
                supplementId: supplement.supplementId ?? null,
                name: supplement.name,
                brand: supplement.brand ?? null,
                servingSize: supplement.servingSize ?? null,
                servingsPerContainer: supplement.servingsPerContainer ?? null,
                sourceUrl: supplement.sourceUrl ?? null,
                notes: supplement.notes ?? null,
                researchedAt: supplement.researchedAt ? new Date(supplement.researchedAt) : null,
            }));
            return adminNutritionSupplementsUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
        },
    });
}
