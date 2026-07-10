import { inArray } from 'drizzle-orm';
import { workoutSessions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch delete of gym sessions. FK cascade removes the session's sets.
export async function workoutSessionsDelete(
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
            throw new Error(`workoutSessionsDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...sessionIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
