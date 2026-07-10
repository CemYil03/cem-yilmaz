import type { AdminFitnessWorkoutSession } from '../db/schema';
import type { GqlSAdminFitnessWorkoutSession, GqlSAdminFitnessWorkoutSet } from '../graphql/generated';

export function toGqlAdminFitnessWorkoutSession(
    row: AdminFitnessWorkoutSession,
    sets: GqlSAdminFitnessWorkoutSet[],
): GqlSAdminFitnessWorkoutSession {
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
