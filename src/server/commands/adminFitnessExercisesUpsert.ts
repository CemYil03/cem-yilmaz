import { tool } from 'ai';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { exercises } from '../db/schema';
import type { AdminFitnessExerciseCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminFitnessExerciseInputSchema } from '../graphql/generated';
import type { GqlSAdminFitnessExerciseInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch upsert of catalog exercises. Every row with an `exerciseId` is
// updated; every row without one is inserted.
export async function adminFitnessExercisesUpsert(
    userId: string,
    inputs: readonly GqlSAdminFitnessExerciseInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    const rows = inputs.map((exercise) => {
        const exerciseId = exercise.exerciseId ?? crypto.randomUUID();
        const payload: AdminFitnessExerciseCreate = {
            exerciseId,
            name: exercise.name,
            muscleGroup: exercise.muscleGroup,
            equipment: exercise.equipment ?? null,
            notes: exercise.notes ?? null,
            updatedAt: now,
        };
        return { exerciseId, isUpdate: Boolean(exercise.exerciseId), payload };
    });

    try {
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.exerciseId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ exerciseId: exercises.exerciseId })
                    .from(exercises)
                    .where(inArray(exercises.exerciseId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.exerciseId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`adminFitnessExercisesUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction.update(exercises).set(row.payload).where(eq(exercises.exerciseId, row.exerciseId));
                } else {
                    await transaction.insert(exercises).values(row.payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.exerciseId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

const toolExercisesUpsertInputSchema = z.object({
    exercises: z.array(GqlSAdminFitnessExerciseInputSchema()).min(1),
});

interface FitnessAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolExercisesUpsert({ serverRuntime, session }: FitnessAgentToolContext) {
    return tool({
        description: [
            'Batch create-or-edit of catalog exercises (name + muscle group + equipment). Add an exercise here',
            'before logging sets against it if it does not exist yet. Every row with an `exerciseId` is updated;',
            'every row without one is inserted. Returns `referenceIds` in input order.',
        ].join(' '),
        inputSchema: toolExercisesUpsertInputSchema,
        execute: async (rawInput) => {
            const inputs = rawInput.exercises as GqlSAdminFitnessExerciseInput[];
            return adminFitnessExercisesUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
        },
    });
}
