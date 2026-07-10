import type { Exercise } from '../db/schema';
import type { GqlSExercise } from '../graphql/generated';

export function toGqlExercise(row: Exercise): GqlSExercise {
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
