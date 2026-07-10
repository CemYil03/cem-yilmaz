import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { workoutSets } from '../db/schema';
import type { GqlSExerciseInput, GqlSWorkoutSessionInput, GqlSWorkoutSetInput } from '../graphql/generated';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { exercisesUpsert } from './exercisesUpsert';
import { workoutSessionsUpsert } from './workoutSessionsUpsert';
import { workoutSetsUpsert } from './workoutSetsUpsert';

// Seeds a parent session + exercise so a set has valid FKs, then returns their
// ids alongside the runtime/session.
async function seedParents() {
    const { serverRuntime, requestingSession } = await commandSetup();
    const userId = requestingSession.userId!;

    const exerciseInput: GqlSExerciseInput = {
        exerciseId: null,
        name: 'Back Squat',
        muscleGroup: 'legs',
        equipment: 'barbell',
        notes: null,
    };
    const exercise = await exercisesUpsert(userId, [exerciseInput], requestingSession, serverRuntime);
    const exerciseId = exercise.referenceIds![0]!;

    const sessionInput: GqlSWorkoutSessionInput = {
        sessionId: null,
        date: '2026-07-09',
        title: 'Leg day',
        routineId: null,
        durationMinutes: null,
        notes: null,
    };
    const workout = await workoutSessionsUpsert(userId, [sessionInput], requestingSession, serverRuntime);
    const sessionId = workout.referenceIds![0]!;

    return { serverRuntime, requestingSession, userId, exerciseId, sessionId };
}

const setInput = (sessionId: string, exerciseId: string, overrides: Partial<GqlSWorkoutSetInput> = {}): GqlSWorkoutSetInput => ({
    setId: null,
    sessionId,
    exerciseId,
    position: null,
    weight: 100,
    reps: 5,
    rpe: null,
    isWarmup: null,
    notes: null,
    ...overrides,
});

describe('workoutSetsUpsert', () => {
    it('logs a 5×5 as five rows against one session in input order', async () => {
        const { serverRuntime, requestingSession, userId, exerciseId, sessionId } = await seedParents();

        const inputs = Array.from({ length: 5 }, () => setInput(sessionId, exerciseId));
        const result = await workoutSetsUpsert(userId, inputs, requestingSession, serverRuntime);

        expect(result.success).toBe(true);
        expect(result.referenceIds).toHaveLength(5);
        const rows = await testDb.select().from(workoutSets).where(eq(workoutSets.sessionId, sessionId));
        expect(rows).toHaveLength(5);
        // Positions default to a contiguous tail 0..4.
        expect(rows.map((r) => r.position).sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
        expect(rows.every((r) => r.weight === 100 && r.reps === 5)).toBe(true);
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId });
    });

    it('throws when the parent session does not exist', async () => {
        const { serverRuntime, requestingSession, userId, exerciseId } = await seedParents();
        const missingSessionId = crypto.randomUUID();

        await expect(workoutSetsUpsert(userId, [setInput(missingSessionId, exerciseId)], requestingSession, serverRuntime)).rejects.toThrow(
            /parent sessions not found/,
        );
    });

    it('throws when the exercise does not exist', async () => {
        const { serverRuntime, requestingSession, userId, sessionId } = await seedParents();
        const missingExerciseId = crypto.randomUUID();

        await expect(workoutSetsUpsert(userId, [setInput(sessionId, missingExerciseId)], requestingSession, serverRuntime)).rejects.toThrow(
            /exercises not found/,
        );
    });

    it('updates an existing set in place', async () => {
        const { serverRuntime, requestingSession, userId, exerciseId, sessionId } = await seedParents();
        const seeded = await workoutSetsUpsert(userId, [setInput(sessionId, exerciseId)], requestingSession, serverRuntime);
        const setId = seeded.referenceIds![0]!;

        await workoutSetsUpsert(
            userId,
            [setInput(sessionId, exerciseId, { setId, weight: 110, reps: 3 })],
            requestingSession,
            serverRuntime,
        );

        const rows = await testDb.select().from(workoutSets).where(eq(workoutSets.setId, setId));
        expect(rows).toHaveLength(1);
        expect(rows[0]!.weight).toBe(110);
        expect(rows[0]!.reps).toBe(3);
    });
});
