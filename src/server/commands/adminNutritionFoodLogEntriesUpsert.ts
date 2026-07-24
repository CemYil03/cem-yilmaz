import { tool } from 'ai';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { foodLogEntries, recipes } from '../db/schema';
import type { AdminNutritionFoodLogEntryCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminNutritionFoodLogKindSchema, GqlSAdminNutritionMealTypeSchema } from '../graphql/generated';
import type { GqlSAdminNutritionFoodLogEntryInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch upsert of diary entries. Every row with a `logId` is updated; every
// row without one is inserted. A referenced `recipeId` is verified in one
// round-trip. `consumedAt` is a `DateTime` scalar (arrives as a JS `Date`) and
// maps straight onto the timestamptz column.
export async function adminNutritionFoodLogEntriesUpsert(
    userId: string,
    inputs: readonly GqlSAdminNutritionFoodLogEntryInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    const rows = inputs.map((entry) => {
        const logId = entry.logId ?? crypto.randomUUID();
        const payload: AdminNutritionFoodLogEntryCreate = {
            logId,
            consumedAt: entry.consumedAt,
            mealType: entry.mealType,
            kind: entry.kind,
            description: entry.description,
            recipeId: entry.recipeId ?? null,
            notes: entry.notes ?? null,
            updatedAt: now,
        };
        return { logId, isUpdate: Boolean(entry.logId), recipeId: entry.recipeId ?? null, payload };
    });

    try {
        const recipeIds = Array.from(new Set(rows.map((row) => row.recipeId).filter((id): id is string => id !== null)));
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.logId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (recipeIds.length > 0) {
                const found = await transaction
                    .select({ recipeId: recipes.recipeId })
                    .from(recipes)
                    .where(inArray(recipes.recipeId, recipeIds));
                if (found.length !== recipeIds.length) {
                    const present = new Set(found.map((row) => row.recipeId));
                    const missing = recipeIds.filter((id) => !present.has(id));
                    throw new Error(`adminNutritionFoodLogEntriesUpsert: recipes not found: ${missing.join(', ')}`);
                }
            }
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ logId: foodLogEntries.logId })
                    .from(foodLogEntries)
                    .where(inArray(foodLogEntries.logId, updateIds));
                if (existing.length !== updateIds.length) {
                    const present = new Set(existing.map((row) => row.logId));
                    const missing = updateIds.filter((id) => !present.has(id));
                    throw new Error(`adminNutritionFoodLogEntriesUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction.update(foodLogEntries).set(row.payload).where(eq(foodLogEntries.logId, row.logId));
                } else {
                    await transaction.insert(foodLogEntries).values(row.payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.logId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

// Batch create-or-edit of food/drink diary entries. Hand-built item schema —
// `consumedAt` is a `DateTime` scalar (`z.date()`), which Gemini's structured
// output rejects, so it rides the wire as an ISO string and `execute` converts
// with `new Date(...)`. The `AdminNutritionMealType` / `AdminNutritionFoodLogKind` enum schemas are reused.

const foodLogItemSchema = z.object({
    logId: z.uuid().nullish().describe('Omit (or null) to create a new entry. Pass an existing id to edit.'),
    consumedAt: z.string().describe('ISO-8601 timestamp of when it was eaten/drunk. Use the current time if Cem does not say.'),
    mealType: GqlSAdminNutritionMealTypeSchema.describe('breakfast | lunch | dinner | snack | other'),
    kind: GqlSAdminNutritionFoodLogKindSchema.describe('food | drink'),
    description: z.string().min(1).max(2000).describe('What was eaten or drunk.'),
    recipeId: z.uuid().nullish().describe('Optional: link to a cookbook recipe.'),
    notes: z.string().max(2000).nullish(),
});

const toolFoodLogEntriesUpsertInputSchema = z.object({
    foodLogEntries: z.array(foodLogItemSchema).min(1).describe('One or more diary entries to log or edit.'),
});

interface NutritionAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolFoodLogEntriesUpsert({ serverRuntime, session }: NutritionAgentToolContext) {
    return tool({
        description: [
            'Batch create-or-edit of food/drink diary entries — the "I ate/drank X" path. Every row with a `logId`',
            'is updated; every row without one is inserted. Set `kind` to food or drink so the weekly overview can',
            'split them. Batch multiple items from one meal into a single call. Returns `referenceIds` in input',
            'order.',
        ].join(' '),
        inputSchema: toolFoodLogEntriesUpsertInputSchema,
        execute: async (input) => {
            const inputs: GqlSAdminNutritionFoodLogEntryInput[] = input.foodLogEntries.map((entry) => ({
                logId: entry.logId ?? null,
                consumedAt: new Date(entry.consumedAt),
                mealType: entry.mealType,
                kind: entry.kind,
                description: entry.description,
                recipeId: entry.recipeId ?? null,
                notes: entry.notes ?? null,
            }));
            return adminNutritionFoodLogEntriesUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
        },
    });
}
