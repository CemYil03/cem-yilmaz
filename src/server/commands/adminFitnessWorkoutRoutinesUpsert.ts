import { tool } from 'ai';
import { desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { workoutRoutines } from '../db/schema';
import type { AdminFitnessWorkoutRoutineCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminFitnessWorkoutRoutineInputSchema } from '../graphql/generated';
import type { GqlSAdminFitnessWorkoutRoutineInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch upsert of workout routines. Every row with a `routineId` is updated;
// every row without one is inserted. New routines append at the tail
// (`position = max + 1`, read once and incremented locally so a batch lands
// contiguously).
export async function adminFitnessWorkoutRoutinesUpsert(
    userId: string,
    inputs: readonly GqlSAdminFitnessWorkoutRoutineInput[],
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
                    throw new Error(`adminFitnessWorkoutRoutinesUpsert: rows not found: ${missing.join(', ')}`);
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
                const payload: AdminFitnessWorkoutRoutineCreate = {
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

const toolWorkoutRoutinesUpsertInputSchema = z.object({
    workoutRoutines: z.array(GqlSAdminFitnessWorkoutRoutineInputSchema()).min(1),
});

interface FitnessAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolWorkoutRoutinesUpsert({ serverRuntime, session }: FitnessAgentToolContext) {
    return tool({
        description: [
            'Batch create-or-edit of workout routines (reusable templates like "Push day"). This writes the routine',
            'header only — add its exercises with `workoutRoutineItemsUpsert` using the returned `referenceIds` as',
            'the parent `routineId`. Every row with a `routineId` is updated; every row without one is inserted.',
        ].join(' '),
        inputSchema: toolWorkoutRoutinesUpsertInputSchema,
        execute: async (rawInput) => {
            const inputs = rawInput.workoutRoutines as GqlSAdminFitnessWorkoutRoutineInput[];
            return adminFitnessWorkoutRoutinesUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
        },
    });
}
