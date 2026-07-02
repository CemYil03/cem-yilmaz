import { eq } from 'drizzle-orm';
import { movies } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationMovieDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

export async function movieDelete(
    userId: string,
    args: GqlSAdminMutationMovieDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(movies)
            .where(eq(movies.movieId, args.movieId))
            .returning({ movieId: movies.movieId });
        if (deleted.length === 0) {
            throw new Error(`movieDelete: row ${args.movieId} not found`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
