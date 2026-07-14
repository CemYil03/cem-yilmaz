import { tool } from 'ai';
import { inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { workoutSets } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch delete of logged sets.
export async function adminFitnessWorkoutSetsDelete(
    userId: string,
    setIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(workoutSets)
            .where(inArray(workoutSets.setId, setIds as string[]))
            .returning({ setId: workoutSets.setId });
        if (deleted.length !== setIds.length) {
            const found = new Set(deleted.map((row) => row.setId));
            const missing = setIds.filter((id) => !found.has(id));
            throw new Error(`adminFitnessWorkoutSetsDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...setIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

const workoutSetsDeleteInputSchema = z.object({
    setIds: z.array(z.uuid()).min(1).describe('Logged set ids to delete.'),
});

interface FitnessAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolWorkoutSetsDelete({ serverRuntime, session }: FitnessAgentToolContext) {
    return tool({
        description: 'Delete one or more logged sets. Use when Cem wants to remove a set he logged.',
        inputSchema: workoutSetsDeleteInputSchema,
        execute: async (input) => {
            return adminFitnessWorkoutSetsDelete(requireAdminUserId(session), input.setIds, session, serverRuntime);
        },
    });
}
