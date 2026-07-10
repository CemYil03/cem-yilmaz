import type { WorkoutRoutineItem } from '../db/schema';
import type { GqlSExercise, GqlSWorkoutRoutineItem } from '../graphql/generated';

// The loading query owns the exercise join and passes the hydrated exercise
// in — mirrors `toGqlMealPlanEntry` receiving its recipe.
export function toGqlWorkoutRoutineItem(row: WorkoutRoutineItem, exercise: GqlSExercise): GqlSWorkoutRoutineItem {
    return {
        routineItemId: row.routineItemId,
        routineId: row.routineId,
        exercise,
        position: row.position,
        targetSets: row.targetSets,
        targetReps: row.targetReps,
        targetWeight: row.targetWeight,
        notes: row.notes,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
