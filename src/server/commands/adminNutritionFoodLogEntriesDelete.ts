import { tool } from 'ai';
import { inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { foodLogEntries } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch delete of diary entries.
export async function adminNutritionFoodLogEntriesDelete(
    userId: string,
    logIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(foodLogEntries)
            .where(inArray(foodLogEntries.logId, logIds as string[]))
            .returning({ logId: foodLogEntries.logId });
        if (deleted.length !== logIds.length) {
            const found = new Set(deleted.map((row) => row.logId));
            const missing = logIds.filter((id) => !found.has(id));
            throw new Error(`adminNutritionFoodLogEntriesDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...logIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

const foodLogEntriesDeleteInputSchema = z.object({
    logIds: z.array(z.uuid()).min(1).describe('Diary entry ids to delete.'),
});

interface NutritionAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolFoodLogEntriesDelete({ serverRuntime, session }: NutritionAgentToolContext) {
    return tool({
        description: 'Delete one or more diary entries. Use when Cem wants to remove something he logged.',
        inputSchema: foodLogEntriesDeleteInputSchema,
        execute: async (input) => {
            return adminNutritionFoodLogEntriesDelete(requireAdminUserId(session), input.logIds, session, serverRuntime);
        },
    });
}
