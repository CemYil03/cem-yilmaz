import { tool } from 'ai';
import { inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { mealPlanEntries } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch delete of soft-plan slots. Clearing a week cell is a one-element call.
export async function adminNutritionMealPlanEntriesDelete(
    userId: string,
    entryIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(mealPlanEntries)
            .where(inArray(mealPlanEntries.entryId, entryIds as string[]))
            .returning({ entryId: mealPlanEntries.entryId });
        if (deleted.length !== entryIds.length) {
            const found = new Set(deleted.map((row) => row.entryId));
            const missing = entryIds.filter((id) => !found.has(id));
            throw new Error(`adminNutritionMealPlanEntriesDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...entryIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

const mealPlanEntriesDeleteInputSchema = z.object({
    entryIds: z.array(z.uuid()).min(1).describe('Meal-plan slot ids to clear.'),
});

interface NutritionAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolMealPlanEntriesDelete({ serverRuntime, session }: NutritionAgentToolContext) {
    return tool({
        description: 'Clear one or more soft-plan slots. Use when Cem wants to remove a planned meal.',
        inputSchema: mealPlanEntriesDeleteInputSchema,
        execute: async (input) => {
            return adminNutritionMealPlanEntriesDelete(requireAdminUserId(session), input.entryIds, session, serverRuntime);
        },
    });
}
