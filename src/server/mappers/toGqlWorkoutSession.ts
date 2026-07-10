import type { WorkoutSession } from '../db/schema';
import type { GqlSWorkoutSession, GqlSWorkoutSet } from '../graphql/generated';

export function toGqlWorkoutSession(row: WorkoutSession, sets: GqlSWorkoutSet[]): GqlSWorkoutSession {
    return {
        sessionId: row.sessionId,
        date: row.date,
        title: row.title,
        routineId: row.routineId,
        durationMinutes: row.durationMinutes,
        notes: row.notes,
        sets,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
