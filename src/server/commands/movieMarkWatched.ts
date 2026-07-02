import { eq } from 'drizzle-orm';
import { movies } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationMovieMarkWatchedArgs, GqlSMovie, GqlSSession } from '../graphql/generated';
import { toGqlMovie } from '../mappers/toGqlMovie';

// Convenience shortcut over `movieUpsert`: flips a row to `status='watched'`,
// stamps `watchedAt` to now, and optionally writes `rating` (1..10). Fields
// the caller doesn't touch are left alone. The media page's card kebab
// binds "Mark watched" to this so the common flow is one click + a rating
// popover, not a full form.
export async function movieMarkWatched(
    userId: string,
    args: GqlSAdminMutationMovieMarkWatchedArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMovie> {
    const { movieId, rating } = args;
    const now = new Date();
    if (rating !== null && rating !== undefined && (rating < 1 || rating > 10)) {
        throw new Error(`movieMarkWatched: rating ${rating} out of range (expected 1..10)`);
    }
    try {
        const [updated] = await serverRuntime.db
            .update(movies)
            .set({
                status: 'watched',
                watchedAt: now,
                ...(rating !== null && rating !== undefined ? { rating } : {}),
                updatedAt: now,
            })
            .where(eq(movies.movieId, movieId))
            .returning();
        if (!updated) {
            throw new Error(`movieMarkWatched: row ${movieId} not found`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return toGqlMovie(updated);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
