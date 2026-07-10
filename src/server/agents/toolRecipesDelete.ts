import { tool } from 'ai';
import { z } from 'zod';
import { adminNutritionRecipesDelete } from '../commands/adminNutritionRecipesDelete';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { NutritionAgentMutationLog } from './agentPersonalAssistantNutrition';
import { requireAdminUserId } from './requireAdminUserId';

const recipesDeleteInputSchema = z.object({
    recipeIds: z
        .array(z.uuid())
        .min(1)
        .describe('AdminNutritionRecipe ids to delete. Referencing plan slots / diary entries survive as free text (FK sets null).'),
});

interface NutritionAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: NutritionAgentMutationLog;
}

export function toolRecipesDelete({ serverRuntime, session, mutations }: NutritionAgentMutationContext) {
    return tool({
        description: 'Permanently delete one or more recipes. Use only when Cem explicitly says to delete.',
        inputSchema: recipesDeleteInputSchema,
        execute: async (input) => {
            const result = await adminNutritionRecipesDelete(requireAdminUserId(session), input.recipeIds, session, serverRuntime);
            for (const recipeId of input.recipeIds) mutations.push({ kind: 'recipeDelete', id: recipeId });
            return result;
        },
    });
}
