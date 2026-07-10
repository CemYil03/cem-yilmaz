import type { WorkoutSet } from '../db/schema';
import type { GqlSExercise, GqlSWorkoutSet } from '../graphql/generated';

export function toGqlWorkoutSet(row: WorkoutSet, exercise: GqlSExercise): GqlSWorkoutSet {
    return {
        setId: row.setId,
        sessionId: row.sessionId,
        exercise,
        position: row.position,
        weight: row.weight,
        reps: row.reps,
        rpe: row.rpe,
        isWarmup: row.isWarmup,
        notes: row.notes,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
