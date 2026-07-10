import type { AdminFitnessWorkoutSet } from '../db/schema';
import type { GqlSAdminFitnessExercise, GqlSAdminFitnessWorkoutSet } from '../graphql/generated';

export function toGqlAdminFitnessWorkoutSet(row: AdminFitnessWorkoutSet, exercise: GqlSAdminFitnessExercise): GqlSAdminFitnessWorkoutSet {
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
