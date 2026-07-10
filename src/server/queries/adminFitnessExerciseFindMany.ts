import { asc } from 'drizzle-orm';
import { exercises } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminFitnessExercise, GqlSSession } from '../graphql/generated';
import { toGqlAdminFitnessExercise } from '../mappers/toGqlAdminFitnessExercise';

// The exercise catalog, ordered by muscle group then name so the page can
// group and the agent snapshot reads predictably.
export async function adminFitnessExerciseFindMany(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminFitnessExercise[]> {
    try {
        const rows = await serverRuntime.db.select().from(exercises).orderBy(asc(exercises.muscleGroup), asc(exercises.name));
        return rows.map(toGqlAdminFitnessExercise);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
