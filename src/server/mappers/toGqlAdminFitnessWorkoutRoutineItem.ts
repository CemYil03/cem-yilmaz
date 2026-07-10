import type { AdminFitnessWorkoutRoutineItem } from '../db/schema';
import type { GqlSAdminFitnessExercise, GqlSAdminFitnessWorkoutRoutineItem } from '../graphql/generated';

// The loading query owns the exercise join and passes the hydrated exercise
// in — mirrors `toGqlAdminNutritionMealPlanEntry` receiving its recipe.
export function toGqlAdminFitnessWorkoutRoutineItem(
    row: AdminFitnessWorkoutRoutineItem,
    exercise: GqlSAdminFitnessExercise,
): GqlSAdminFitnessWorkoutRoutineItem {
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
