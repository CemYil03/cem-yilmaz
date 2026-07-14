import { tool } from 'ai';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { mealPlanEntries, recipes } from '../db/schema';
import type { AdminNutritionMealPlanEntryCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminNutritionMealPlanEntryInputSchema } from '../graphql/generated';
import type { GqlSAdminNutritionMealPlanEntryInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch upsert of soft-plan slots. Every row with an `entryId` is updated;
// every row without one is inserted. A referenced `recipeId` is verified in
// one round-trip so a hallucinated id fails the transaction rather than
// nulling silently. The `date` scalar is a `YYYY-MM-DD` string, matching the
// string-mode `date` column directly.
export async function adminNutritionMealPlanEntriesUpsert(
    userId: string,
    inputs: readonly GqlSAdminNutritionMealPlanEntryInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    const rows = inputs.map((entry) => {
        const entryId = entry.entryId ?? crypto.randomUUID();
        const payload: AdminNutritionMealPlanEntryCreate = {
            entryId,
            date: entry.date,
            mealType: entry.mealType,
            recipeId: entry.recipeId ?? null,
            customText: entry.customText ?? null,
            notes: entry.notes ?? null,
            updatedAt: now,
        };
        return { entryId, isUpdate: Boolean(entry.entryId), recipeId: entry.recipeId ?? null, payload };
    });

    try {
        const recipeIds = Array.from(new Set(rows.map((row) => row.recipeId).filter((id): id is string => id !== null)));
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.entryId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (recipeIds.length > 0) {
                const found = await transaction
                    .select({ recipeId: recipes.recipeId })
                    .from(recipes)
                    .where(inArray(recipes.recipeId, recipeIds));
                if (found.length !== recipeIds.length) {
                    const present = new Set(found.map((row) => row.recipeId));
                    const missing = recipeIds.filter((id) => !present.has(id));
                    throw new Error(`adminNutritionMealPlanEntriesUpsert: recipes not found: ${missing.join(', ')}`);
                }
            }
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ entryId: mealPlanEntries.entryId })
                    .from(mealPlanEntries)
                    .where(inArray(mealPlanEntries.entryId, updateIds));
                if (existing.length !== updateIds.length) {
                    const present = new Set(existing.map((row) => row.entryId));
                    const missing = updateIds.filter((id) => !present.has(id));
                    throw new Error(`adminNutritionMealPlanEntriesUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction.update(mealPlanEntries).set(row.payload).where(eq(mealPlanEntries.entryId, row.entryId));
                } else {
                    await transaction.insert(mealPlanEntries).values(row.payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.entryId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

// Batch create-or-edit of soft-plan slots. Reuses the generated input schema —
// `AdminNutritionMealPlanEntryInput.date` is a `Date` scalar (a `YYYY-MM-DD` string), so the
// schema is Gemini-safe (no `z.date()`).

const toolMealPlanEntriesUpsertInputSchema = z.object({
    mealPlanEntries: z.array(GqlSAdminNutritionMealPlanEntryInputSchema()).min(1),
});

interface NutritionAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolMealPlanEntriesUpsert({ serverRuntime, session }: NutritionAgentToolContext) {
    return tool({
        description: [
            'Batch create-or-edit of soft meal-plan slots. Each slot is a `(date, mealType)` cell that references a',
            'recipe (`recipeId`) or carries a free-text idea (`customText`). `date` is `YYYY-MM-DD`. Plan only the',
            'slots Cem actually wants — empty cells need no row. Every row with an `entryId` is updated; every row',
            'without one is inserted. Batch a whole week into one call. Returns `referenceIds` in input order.',
        ].join(' '),
        inputSchema: toolMealPlanEntriesUpsertInputSchema,
        execute: async (rawInput) => {
            const inputs = rawInput.mealPlanEntries as GqlSAdminNutritionMealPlanEntryInput[];
            return adminNutritionMealPlanEntriesUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
        },
    });
}
