import { tool } from 'ai';
import { inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { workoutSessions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch delete of gym sessions. FK cascade removes the session's sets.
export async function adminFitnessWorkoutSessionsDelete(
    userId: string,
    sessionIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(workoutSessions)
            .where(inArray(workoutSessions.sessionId, sessionIds as string[]))
            .returning({ sessionId: workoutSessions.sessionId });
        if (deleted.length !== sessionIds.length) {
            const found = new Set(deleted.map((row) => row.sessionId));
            const missing = sessionIds.filter((id) => !found.has(id));
            throw new Error(`adminFitnessWorkoutSessionsDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...sessionIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

const workoutSessionsDeleteInputSchema = z.object({
    sessionIds: z.array(z.uuid()).min(1).describe('Session ids to delete. FK cascade removes their sets.'),
});

interface FitnessAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolWorkoutSessionsDelete({ serverRuntime, session }: FitnessAgentToolContext) {
    return tool({
        description: 'Delete one or more gym sessions and all their sets. Use only when Cem explicitly says to delete.',
        inputSchema: workoutSessionsDeleteInputSchema,
        execute: async (input) => {
            return adminFitnessWorkoutSessionsDelete(requireAdminUserId(session), input.sessionIds, session, serverRuntime);
        },
    });
}
