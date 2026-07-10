import { desc, eq, inArray } from 'drizzle-orm';
import { exercises, workoutRoutineItems, workoutRoutines } from '../db/schema';
import type { AdminFitnessWorkoutRoutineItemCreate } from '../db/schema';
import type { GqlSMutationResult, GqlSSession, GqlSAdminFitnessWorkoutRoutineItemInput } from '../graphql/generated';
import type { ServerRuntime } from '../domain/ServerRuntime';

// Batch upsert of routine items. Every row with a `routineItemId` is updated;
// every row without one is inserted. Parent routine and referenced exercise
// existence are each verified in one round-trip. `position` defaults to the
// tail within the parent routine, read once per routine and incremented
// locally so a same-routine batch lays out contiguously.
export async function adminFitnessWorkoutRoutineItemsUpsert(
    userId: string,
    inputs: readonly GqlSAdminFitnessWorkoutRoutineItemInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    const seeds = inputs.map((item) => ({
        routineItemId: item.routineItemId ?? crypto.randomUUID(),
        item,
        isUpdate: Boolean(item.routineItemId),
    }));

    try {
        const parentRoutineIds = Array.from(new Set(seeds.map((seed) => seed.item.routineId)));
        const exerciseIds = Array.from(new Set(seeds.map((seed) => seed.item.exerciseId)));
        const updateIds = seeds.filter((seed) => seed.isUpdate).map((seed) => seed.routineItemId);

        await serverRuntime.db.transaction(async (transaction) => {
            const routines = await transaction
                .select({ routineId: workoutRoutines.routineId })
                .from(workoutRoutines)
                .where(inArray(workoutRoutines.routineId, parentRoutineIds));
            if (routines.length !== parentRoutineIds.length) {
                const found = new Set(routines.map((row) => row.routineId));
                const missing = parentRoutineIds.filter((id) => !found.has(id));
                throw new Error(`adminFitnessWorkoutRoutineItemsUpsert: parent routines not found: ${missing.join(', ')}`);
            }
            const foundExercises = await transaction
                .select({ exerciseId: exercises.exerciseId })
                .from(exercises)
                .where(inArray(exercises.exerciseId, exerciseIds));
            if (foundExercises.length !== exerciseIds.length) {
                const found = new Set(foundExercises.map((row) => row.exerciseId));
                const missing = exerciseIds.filter((id) => !found.has(id));
                throw new Error(`adminFitnessWorkoutRoutineItemsUpsert: exercises not found: ${missing.join(', ')}`);
            }
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ routineItemId: workoutRoutineItems.routineItemId })
                    .from(workoutRoutineItems)
                    .where(inArray(workoutRoutineItems.routineItemId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.routineItemId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`adminFitnessWorkoutRoutineItemsUpsert: rows not found: ${missing.join(', ')}`);
                }
            }

            const tailByRoutine = new Map<string, number>();
            for (const { routineItemId, item, isUpdate } of seeds) {
                let position = item.position ?? null;
                if (position === null && !isUpdate) {
                    const cached = tailByRoutine.get(item.routineId);
                    if (cached === undefined) {
                        const [top] = await transaction
                            .select({ position: workoutRoutineItems.position })
                            .from(workoutRoutineItems)
                            .where(eq(workoutRoutineItems.routineId, item.routineId))
                            .orderBy(desc(workoutRoutineItems.position))
                            .limit(1);
                        position = top ? top.position + 1 : 0;
                    } else {
                        position = cached + 1;
                    }
                    tailByRoutine.set(item.routineId, position);
                }
                const payload: AdminFitnessWorkoutRoutineItemCreate = {
                    routineItemId,
                    routineId: item.routineId,
                    exerciseId: item.exerciseId,
                    position: position ?? 0,
                    targetSets: item.targetSets ?? null,
                    targetReps: item.targetReps ?? null,
                    targetWeight: item.targetWeight ?? null,
                    notes: item.notes ?? null,
                    updatedAt: now,
                };
                if (isUpdate) {
                    await transaction.update(workoutRoutineItems).set(payload).where(eq(workoutRoutineItems.routineItemId, routineItemId));
                } else {
                    await transaction.insert(workoutRoutineItems).values(payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: seeds.map((seed) => seed.routineItemId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
