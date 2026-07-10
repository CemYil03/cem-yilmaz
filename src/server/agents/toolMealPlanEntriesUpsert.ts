import { tool } from 'ai';
import { z } from 'zod';
import { adminNutritionMealPlanEntriesUpsert } from '../commands/adminNutritionMealPlanEntriesUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminNutritionMealPlanEntryInputSchema } from '../graphql/generated';
import type { GqlSAdminNutritionMealPlanEntryInput, GqlSSession } from '../graphql/generated';
import type { NutritionAgentMutationLog } from './agentPersonalAssistantNutrition';
import { requireAdminUserId } from './requireAdminUserId';

// Batch create-or-edit of soft-plan slots. Reuses the generated input schema —
// `AdminNutritionMealPlanEntryInput.date` is a `Date` scalar (a `YYYY-MM-DD` string), so the
// schema is Gemini-safe (no `z.date()`).

const toolMealPlanEntriesUpsertInputSchema = z.object({
    mealPlanEntries: z.array(GqlSAdminNutritionMealPlanEntryInputSchema()).min(1),
});

interface NutritionAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: NutritionAgentMutationLog;
}

export function toolMealPlanEntriesUpsert({ serverRuntime, session, mutations }: NutritionAgentMutationContext) {
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
            const result = await adminNutritionMealPlanEntriesUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
            const referenceIds = result.referenceIds ?? [];
            inputs.forEach((entry, index) => {
                mutations.push({
                    kind: entry.entryId ? 'mealPlanUpdate' : 'mealPlanAdd',
                    id: referenceIds[index] ?? entry.entryId ?? '',
                    title: `${entry.date} ${entry.mealType}`,
                });
            });
            return result;
        },
    });
}
