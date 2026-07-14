import { tool } from 'ai';
import { inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { workoutRoutines } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch delete of routines. FK cascade removes the routine's items; any
// `AdminFitnessWorkoutSession.routineId` pointing here is nulled (the session survives as
// an ad-hoc log).
export async function adminFitnessWorkoutRoutinesDelete(
    userId: string,
    routineIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(workoutRoutines)
            .where(inArray(workoutRoutines.routineId, routineIds as string[]))
            .returning({ routineId: workoutRoutines.routineId });
        if (deleted.length !== routineIds.length) {
            const found = new Set(deleted.map((row) => row.routineId));
            const missing = routineIds.filter((id) => !found.has(id));
            throw new Error(`adminFitnessWorkoutRoutinesDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...routineIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

const workoutRoutinesDeleteInputSchema = z.object({
    routineIds: z
        .array(z.uuid())
        .min(1)
        .describe('Routine ids to delete. FK cascade removes their items; logged sessions survive (routineId nulled).'),
});

interface FitnessAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolWorkoutRoutinesDelete({ serverRuntime, session }: FitnessAgentToolContext) {
    return tool({
        description: 'Delete one or more routines and their items. Logged workouts are kept. Use only when Cem explicitly says to delete.',
        inputSchema: workoutRoutinesDeleteInputSchema,
        execute: async (input) => {
            return adminFitnessWorkoutRoutinesDelete(requireAdminUserId(session), input.routineIds, session, serverRuntime);
        },
    });
}
