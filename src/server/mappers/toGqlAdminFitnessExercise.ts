import type { AdminFitnessExercise } from '../db/schema';
import type { GqlSAdminFitnessExercise } from '../graphql/generated';

export function toGqlAdminFitnessExercise(row: AdminFitnessExercise): GqlSAdminFitnessExercise {
    return {
        exerciseId: row.exerciseId,
        name: row.name,
        muscleGroup: row.muscleGroup,
        equipment: row.equipment,
        notes: row.notes,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
