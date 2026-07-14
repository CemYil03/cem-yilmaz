import { tool } from 'ai';
import { inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { workoutRoutineItems } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch delete of routine items.
export async function adminFitnessWorkoutRoutineItemsDelete(
    userId: string,
    routineItemIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(workoutRoutineItems)
            .where(inArray(workoutRoutineItems.routineItemId, routineItemIds as string[]))
            .returning({ routineItemId: workoutRoutineItems.routineItemId });
        if (deleted.length !== routineItemIds.length) {
            const found = new Set(deleted.map((row) => row.routineItemId));
            const missing = routineItemIds.filter((id) => !found.has(id));
            throw new Error(`adminFitnessWorkoutRoutineItemsDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...routineItemIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

const workoutRoutineItemsDeleteInputSchema = z.object({
    routineItemIds: z.array(z.uuid()).min(1).describe('Routine item ids to remove.'),
});

interface FitnessAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolWorkoutRoutineItemsDelete({ serverRuntime, session }: FitnessAgentToolContext) {
    return tool({
        description: 'Remove one or more exercises from a routine. Use when Cem wants to drop an exercise from a template.',
        inputSchema: workoutRoutineItemsDeleteInputSchema,
        execute: async (input) => {
            return adminFitnessWorkoutRoutineItemsDelete(requireAdminUserId(session), input.routineItemIds, session, serverRuntime);
        },
    });
}
