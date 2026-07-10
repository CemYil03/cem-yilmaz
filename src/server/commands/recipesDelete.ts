import { inArray } from 'drizzle-orm';
import { recipes } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch delete of recipes. FK `ON DELETE SET NULL` nulls any referencing
// meal-plan slot / diary entry, so those survive as bare ideas / notes.
export async function recipesDelete(
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
            throw new Error(`recipesDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...recipeIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
