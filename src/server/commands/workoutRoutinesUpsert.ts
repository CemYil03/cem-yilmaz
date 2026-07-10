import { desc, eq, inArray } from 'drizzle-orm';
import { workoutRoutines } from '../db/schema';
import type { WorkoutRoutineCreate } from '../db/schema';
import type { GqlSMutationResult, GqlSSession, GqlSWorkoutRoutineInput } from '../graphql/generated';
import type { ServerRuntime } from '../domain/ServerRuntime';

// Batch upsert of workout routines. Every row with a `routineId` is updated;
// every row without one is inserted. New routines append at the tail
// (`position = max + 1`, read once and incremented locally so a batch lands
// contiguously).
export async function workoutRoutinesUpsert(
    userId: string,
    inputs: readonly GqlSWorkoutRoutineInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    const seeds = inputs.map((routine) => ({
        routineId: routine.routineId ?? crypto.randomUUID(),
        routine,
        isUpdate: Boolean(routine.routineId),
    }));

    try {
        const updateIds = seeds.filter((seed) => seed.isUpdate).map((seed) => seed.routineId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ routineId: workoutRoutines.routineId })
                    .from(workoutRoutines)
                    .where(inArray(workoutRoutines.routineId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.routineId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`workoutRoutinesUpsert: rows not found: ${missing.join(', ')}`);
                }
            }

            let tail: number | null = null;
            for (const { routineId, routine, isUpdate } of seeds) {
                let position = routine.position ?? null;
                if (position === null && !isUpdate) {
                    if (tail === null) {
                        const [top] = await transaction
                            .select({ position: workoutRoutines.position })
                            .from(workoutRoutines)
                            .orderBy(desc(workoutRoutines.position))
                            .limit(1);
                        tail = top ? top.position + 1 : 0;
                    } else {
                        tail += 1;
                    }
                    position = tail;
                }
                const payload: WorkoutRoutineCreate = {
                    routineId,
                    name: routine.name,
                    notes: routine.notes ?? null,
                    position: position ?? 0,
                    updatedAt: now,
                };
                if (isUpdate) {
                    await transaction.update(workoutRoutines).set(payload).where(eq(workoutRoutines.routineId, routineId));
                } else {
                    await transaction.insert(workoutRoutines).values(payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: seeds.map((seed) => seed.routineId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
