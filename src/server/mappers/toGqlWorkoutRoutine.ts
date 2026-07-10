import type { WorkoutRoutine } from '../db/schema';
import type { GqlSWorkoutRoutine, GqlSWorkoutRoutineItem } from '../graphql/generated';

export function toGqlWorkoutRoutine(row: WorkoutRoutine, items: GqlSWorkoutRoutineItem[]): GqlSWorkoutRoutine {
    return {
        routineId: row.routineId,
        name: row.name,
        notes: row.notes,
        position: row.position,
        items,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
