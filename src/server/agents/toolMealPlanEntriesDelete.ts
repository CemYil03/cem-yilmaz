import { tool } from 'ai';
import { z } from 'zod';
import { adminNutritionMealPlanEntriesDelete } from '../commands/adminNutritionMealPlanEntriesDelete';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { NutritionAgentMutationLog } from './agentPersonalAssistantNutrition';
import { requireAdminUserId } from './requireAdminUserId';

const mealPlanEntriesDeleteInputSchema = z.object({
    entryIds: z.array(z.uuid()).min(1).describe('Meal-plan slot ids to clear.'),
});

interface NutritionAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: NutritionAgentMutationLog;
}

export function toolMealPlanEntriesDelete({ serverRuntime, session, mutations }: NutritionAgentMutationContext) {
    return tool({
        description: 'Clear one or more soft-plan slots. Use when Cem wants to remove a planned meal.',
        inputSchema: mealPlanEntriesDeleteInputSchema,
        execute: async (input) => {
            const result = await adminNutritionMealPlanEntriesDelete(requireAdminUserId(session), input.entryIds, session, serverRuntime);
            for (const entryId of input.entryIds) mutations.push({ kind: 'mealPlanDelete', id: entryId });
            return result;
        },
    });
}
