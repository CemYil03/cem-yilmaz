import { tool } from 'ai';
import { z } from 'zod';
import { foodLogEntriesUpsert } from '../commands/foodLogEntriesUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSFoodLogKindSchema, GqlSMealTypeSchema } from '../graphql/generated';
import type { GqlSFoodLogEntryInput, GqlSSession } from '../graphql/generated';
import type { NutritionAgentMutationLog } from './agentPersonalAssistantNutrition';
import { requireAdminUserId } from './requireAdminUserId';

// Batch create-or-edit of food/drink diary entries. Hand-built item schema —
// `consumedAt` is a `DateTime` scalar (`z.date()`), which Gemini's structured
// output rejects, so it rides the wire as an ISO string and `execute` converts
// with `new Date(...)`. The `MealType` / `FoodLogKind` enum schemas are reused.

const foodLogItemSchema = z.object({
    logId: z.uuid().nullish().describe('Omit (or null) to create a new entry. Pass an existing id to edit.'),
    consumedAt: z.string().describe('ISO-8601 timestamp of when it was eaten/drunk. Use the current time if Cem does not say.'),
    mealType: GqlSMealTypeSchema.describe('breakfast | lunch | dinner | snack | other'),
    kind: GqlSFoodLogKindSchema.describe('food | drink'),
    description: z.string().min(1).max(2000).describe('What was eaten or drunk.'),
    recipeId: z.uuid().nullish().describe('Optional: link to a cookbook recipe.'),
    notes: z.string().max(2000).nullish(),
});

const toolFoodLogEntriesUpsertInputSchema = z.object({
    foodLogEntries: z.array(foodLogItemSchema).min(1).describe('One or more diary entries to log or edit.'),
});

interface NutritionAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: NutritionAgentMutationLog;
}

export function toolFoodLogEntriesUpsert({ serverRuntime, session, mutations }: NutritionAgentMutationContext) {
    return tool({
        description: [
            'Batch create-or-edit of food/drink diary entries — the "I ate/drank X" path. Every row with a `logId`',
            'is updated; every row without one is inserted. Set `kind` to food or drink so the weekly overview can',
            'split them. Batch multiple items from one meal into a single call. Returns `referenceIds` in input',
            'order.',
        ].join(' '),
        inputSchema: toolFoodLogEntriesUpsertInputSchema,
        execute: async (input) => {
            const inputs: GqlSFoodLogEntryInput[] = input.foodLogEntries.map((entry) => ({
                logId: entry.logId ?? null,
                consumedAt: new Date(entry.consumedAt),
                mealType: entry.mealType,
                kind: entry.kind,
                description: entry.description,
                recipeId: entry.recipeId ?? null,
                notes: entry.notes ?? null,
            }));
            const result = await foodLogEntriesUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
            const referenceIds = result.referenceIds ?? [];
            input.foodLogEntries.forEach((entry, index) => {
                mutations.push({
                    kind: entry.logId ? 'foodLogUpdate' : 'foodLogAdd',
                    id: referenceIds[index] ?? entry.logId ?? '',
                    title: entry.description,
                });
            });
            return result;
        },
    });
}
