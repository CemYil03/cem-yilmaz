import { inArray } from 'drizzle-orm';
import { exercises } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch delete of catalog exercises. FK `ON DELETE CASCADE` removes any
// routine items and logged sets that reference the exercise — deleting a
// movement scrubs it from history. The UI warns before calling this.
export async function adminFitnessExercisesDelete(
    userId: string,
    exerciseIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(exercises)
            .where(inArray(exercises.exerciseId, exerciseIds as string[]))
            .returning({ exerciseId: exercises.exerciseId });
        if (deleted.length !== exerciseIds.length) {
            const found = new Set(deleted.map((row) => row.exerciseId));
            const missing = exerciseIds.filter((id) => !found.has(id));
            throw new Error(`adminFitnessExercisesDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...exerciseIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
