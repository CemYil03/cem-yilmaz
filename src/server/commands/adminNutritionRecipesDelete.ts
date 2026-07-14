import { tool } from 'ai';
import { inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { recipes } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch delete of recipes. FK `ON DELETE SET NULL` nulls any referencing
// meal-plan slot / diary entry, so those survive as bare ideas / notes.
export async function adminNutritionRecipesDelete(
    userId: string,
    recipeIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(recipes)
            .where(inArray(recipes.recipeId, recipeIds as string[]))
            .returning({ recipeId: recipes.recipeId });
        if (deleted.length !== recipeIds.length) {
            const found = new Set(deleted.map((row) => row.recipeId));
            const missing = recipeIds.filter((id) => !found.has(id));
            throw new Error(`adminNutritionRecipesDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...recipeIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

const recipesDeleteInputSchema = z.object({
    recipeIds: z
        .array(z.uuid())
        .min(1)
        .describe('AdminNutritionRecipe ids to delete. Referencing plan slots / diary entries survive as free text (FK sets null).'),
});

interface NutritionAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolRecipesDelete({ serverRuntime, session }: NutritionAgentToolContext) {
    return tool({
        description: 'Permanently delete one or more recipes. Use only when Cem explicitly says to delete.',
        inputSchema: recipesDeleteInputSchema,
        execute: async (input) => {
            return adminNutritionRecipesDelete(requireAdminUserId(session), input.recipeIds, session, serverRuntime);
        },
    });
}
