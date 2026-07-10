import { asc, inArray } from 'drizzle-orm';
import { exercises, workoutRoutineItems, workoutRoutines } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSExercise, GqlSSession, GqlSWorkoutRoutine, GqlSWorkoutRoutineItem } from '../graphql/generated';
import { toGqlExercise } from '../mappers/toGqlExercise';
import { toGqlWorkoutRoutine } from '../mappers/toGqlWorkoutRoutine';
import { toGqlWorkoutRoutineItem } from '../mappers/toGqlWorkoutRoutineItem';

// Every routine with its items pre-joined (each item's exercise hydrated).
// Ordered `position ASC`. The join fan-out mirrors `adminTravelTripFindMany`:
// one query per relation, then normalize in memory.
export async function adminFitnessRoutineFindMany(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSWorkoutRoutine[]> {
    try {
        const rows = await serverRuntime.db
            .select()
            .from(workoutRoutines)
            .orderBy(asc(workoutRoutines.position), asc(workoutRoutines.name));
        if (rows.length === 0) return [];

        const routineIds = rows.map((r) => r.routineId);
        const itemRows = await serverRuntime.db
            .select()
            .from(workoutRoutineItems)
            .where(inArray(workoutRoutineItems.routineId, routineIds))
            .orderBy(asc(workoutRoutineItems.routineId), asc(workoutRoutineItems.position), asc(workoutRoutineItems.routineItemId));

        const exerciseIds = Array.from(new Set(itemRows.map((i) => i.exerciseId)));
        const exerciseById = new Map<string, GqlSExercise>();
        if (exerciseIds.length > 0) {
            const exerciseRows = await serverRuntime.db.select().from(exercises).where(inArray(exercises.exerciseId, exerciseIds));
            for (const exercise of exerciseRows) exerciseById.set(exercise.exerciseId, toGqlExercise(exercise));
        }

        const itemsByRoutineId = new Map<string, GqlSWorkoutRoutineItem[]>();
        for (const item of itemRows) {
            const exercise = exerciseById.get(item.exerciseId);
            if (!exercise) continue; // FK guarantees presence; guard keeps types honest
            const list = itemsByRoutineId.get(item.routineId) ?? [];
            list.push(toGqlWorkoutRoutineItem(item, exercise));
            itemsByRoutineId.set(item.routineId, list);
        }

        return rows.map((row) => toGqlWorkoutRoutine(row, itemsByRoutineId.get(row.routineId) ?? []));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
