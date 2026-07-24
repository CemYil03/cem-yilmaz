import { asc, desc, inArray } from 'drizzle-orm';
import { exercises, workoutSessions, workoutSets } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminFitnessExercise,
    GqlSAdminFitnessWorkoutSession,
    GqlSAdminFitnessWorkoutSet,
    GqlSSession,
} from '../graphql/generated';
import { toGqlAdminFitnessExercise } from '../mappers/toGqlAdminFitnessExercise';
import { toGqlAdminFitnessWorkoutSession } from '../mappers/toGqlAdminFitnessWorkoutSession';
import { toGqlAdminFitnessWorkoutSet } from '../mappers/toGqlAdminFitnessWorkoutSet';

// Every session with its sets pre-joined (each set's exercise hydrated).
// Ordered `date DESC, createdAt DESC` so the most recent workout sits on top —
// the shape the Workouts tab and the "what did I bench last time?" snapshot
// both want.
export async function adminFitnessSessionFindMany(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminFitnessWorkoutSession[]> {
    try {
        const rows = await serverRuntime.db
            .select()
            .from(workoutSessions)
            .orderBy(desc(workoutSessions.date), desc(workoutSessions.createdAt), asc(workoutSessions.sessionId));
        if (rows.length === 0) return [];

        const sessionIds = rows.map((r) => r.sessionId);
        const setRows = await serverRuntime.db
            .select()
            .from(workoutSets)
            .where(inArray(workoutSets.sessionId, sessionIds))
            .orderBy(asc(workoutSets.sessionId), asc(workoutSets.position), asc(workoutSets.setId));

        const exerciseIds = Array.from(new Set(setRows.map((s) => s.exerciseId)));
        const exerciseById = new Map<string, GqlSAdminFitnessExercise>();
        if (exerciseIds.length > 0) {
            const exerciseRows = await serverRuntime.db.select().from(exercises).where(inArray(exercises.exerciseId, exerciseIds));
            for (const exercise of exerciseRows) exerciseById.set(exercise.exerciseId, toGqlAdminFitnessExercise(exercise));
        }

        const setsBySessionId = new Map<string, GqlSAdminFitnessWorkoutSet[]>();
        for (const set of setRows) {
            const exercise = exerciseById.get(set.exerciseId);
            if (!exercise) continue; // FK guarantees presence; guard keeps types honest
            const list = setsBySessionId.get(set.sessionId) ?? [];
            list.push(toGqlAdminFitnessWorkoutSet(set, exercise));
            setsBySessionId.set(set.sessionId, list);
        }

        return rows.map((row) => toGqlAdminFitnessWorkoutSession(row, setsBySessionId.get(row.sessionId) ?? []));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
