import type { AdminFitnessWorkoutRoutine } from '../db/schema';
import type { GqlSAdminFitnessWorkoutRoutine, GqlSAdminFitnessWorkoutRoutineItem } from '../graphql/generated';

export function toGqlAdminFitnessWorkoutRoutine(
    row: AdminFitnessWorkoutRoutine,
    items: GqlSAdminFitnessWorkoutRoutineItem[],
): GqlSAdminFitnessWorkoutRoutine {
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
