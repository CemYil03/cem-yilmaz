import { tool } from 'ai';
import { desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { exercises, workoutSessions, workoutSets } from '../db/schema';
import type { AdminFitnessWorkoutSetCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminFitnessWorkoutSetInputSchema } from '../graphql/generated';
import type { GqlSAdminFitnessWorkoutSetInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch upsert of logged sets. Every row with a `setId` is updated; every row
// without one is inserted. Parent session and referenced exercise existence
// are each verified in one round-trip — logging "5×5 squats" is one call
// carrying five rows against the session's id. `position` defaults to the tail
// within the session, read once per session and incremented locally.
export async function adminFitnessWorkoutSetsUpsert(
    userId: string,
    inputs: readonly GqlSAdminFitnessWorkoutSetInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    const seeds = inputs.map((set) => ({
        setId: set.setId ?? crypto.randomUUID(),
        set,
        isUpdate: Boolean(set.setId),
    }));

    try {
        const parentSessionIds = Array.from(new Set(seeds.map((seed) => seed.set.sessionId)));
        const exerciseIds = Array.from(new Set(seeds.map((seed) => seed.set.exerciseId)));
        const updateIds = seeds.filter((seed) => seed.isUpdate).map((seed) => seed.setId);

        await serverRuntime.db.transaction(async (transaction) => {
            const sessions = await transaction
                .select({ sessionId: workoutSessions.sessionId })
                .from(workoutSessions)
                .where(inArray(workoutSessions.sessionId, parentSessionIds));
            if (sessions.length !== parentSessionIds.length) {
                const found = new Set(sessions.map((row) => row.sessionId));
                const missing = parentSessionIds.filter((id) => !found.has(id));
                throw new Error(`adminFitnessWorkoutSetsUpsert: parent sessions not found: ${missing.join(', ')}`);
            }
            const foundExercises = await transaction
                .select({ exerciseId: exercises.exerciseId })
                .from(exercises)
                .where(inArray(exercises.exerciseId, exerciseIds));
            if (foundExercises.length !== exerciseIds.length) {
                const found = new Set(foundExercises.map((row) => row.exerciseId));
                const missing = exerciseIds.filter((id) => !found.has(id));
                throw new Error(`adminFitnessWorkoutSetsUpsert: exercises not found: ${missing.join(', ')}`);
            }
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ setId: workoutSets.setId })
                    .from(workoutSets)
                    .where(inArray(workoutSets.setId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.setId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`adminFitnessWorkoutSetsUpsert: rows not found: ${missing.join(', ')}`);
                }
            }

            const tailBySession = new Map<string, number>();
            for (const { setId, set, isUpdate } of seeds) {
                let position = set.position ?? null;
                if (position === null && !isUpdate) {
                    const cached = tailBySession.get(set.sessionId);
                    if (cached === undefined) {
                        const [top] = await transaction
                            .select({ position: workoutSets.position })
                            .from(workoutSets)
                            .where(eq(workoutSets.sessionId, set.sessionId))
                            .orderBy(desc(workoutSets.position))
                            .limit(1);
                        position = top ? top.position + 1 : 0;
                    } else {
                        position = cached + 1;
                    }
                    tailBySession.set(set.sessionId, position);
                }
                const payload: AdminFitnessWorkoutSetCreate = {
                    setId,
                    sessionId: set.sessionId,
                    exerciseId: set.exerciseId,
                    position: position ?? 0,
                    weight: set.weight ?? null,
                    reps: set.reps ?? null,
                    rpe: set.rpe ?? null,
                    isWarmup: set.isWarmup ?? false,
                    notes: set.notes ?? null,
                    updatedAt: now,
                };
                if (isUpdate) {
                    await transaction.update(workoutSets).set(payload).where(eq(workoutSets.setId, setId));
                } else {
                    await transaction.insert(workoutSets).values(payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: seeds.map((seed) => seed.setId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

const toolWorkoutSetsUpsertInputSchema = z.object({
    workoutSets: z.array(GqlSAdminFitnessWorkoutSetInputSchema()).min(1),
});

interface FitnessAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolWorkoutSetsUpsert({ serverRuntime, session }: FitnessAgentToolContext) {
    return tool({
        description: [
            'Batch create-or-edit of logged sets — `weight` × `reps` per set. Every row needs a parent `sessionId`',
            '(from the snapshot or a prior `workoutSessionsUpsert` result) and an `exerciseId`. Logging "5×5 squats',
            'at 100kg" is ONE call carrying five rows (same exercise, weight 100, reps 5). Set `isWarmup` for warmup',
            'sets so they do not count toward PRs. Every row with a `setId` is updated; every row without one is',
            'inserted.',
        ].join(' '),
        inputSchema: toolWorkoutSetsUpsertInputSchema,
        execute: async (rawInput) => {
            const inputs = rawInput.workoutSets as GqlSAdminFitnessWorkoutSetInput[];
            return adminFitnessWorkoutSetsUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
        },
    });
}
