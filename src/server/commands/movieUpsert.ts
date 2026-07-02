import { eq } from 'drizzle-orm';
import { movies } from '../db/schema';
import type { MovieCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationMovieUpsertArgs, GqlSMovie, GqlSSession } from '../graphql/generated';
import { toGqlMovie } from '../mappers/toGqlMovie';

// Two-phase upsert (same shape as `cvExperienceUpsert`). Phase 1 builds the
// insert/update payload off the GraphQL input, Phase 2 runs the single DB
// call in try/catch. `movieId` set → update; absent → insert.
//
// `tmdbId` uniqueness is a table-level constraint (`Movies_tmdbId_key`),
// so a re-insert of the same TMDB movie would fail here — the media page
// avoids the collision by looking the row up first (`movieAddFromTmdb`
// updates the existing row rather than inserting a duplicate). Manual
// entries pass `tmdbId: null` and are duplicate-friendly.
export async function movieUpsert(
    userId: string,
    args: GqlSAdminMutationMovieUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMovie> {
    const { input } = args;
    const movieId = input.movieId ?? crypto.randomUUID();
    const now = new Date();

    const payload: MovieCreate = {
        movieId,
        title: input.title,
        tmdbId: input.tmdbId ?? null,
        posterUrl: input.posterUrl ?? null,
        backdropUrl: input.backdropUrl ?? null,
        releaseDate: input.releaseDate ?? null,
        runtimeMinutes: input.runtimeMinutes ?? null,
        overview: input.overview ?? null,
        status: input.status,
        rating: input.rating ?? null,
        watchedAt: input.watchedAt ?? null,
        notes: input.notes ?? null,
        topics: input.topics,
        updatedAt: now,
    };

    try {
        let row;
        if (input.movieId) {
            const [updated] = await serverRuntime.db.update(movies).set(payload).where(eq(movies.movieId, input.movieId)).returning();
            if (!updated) {
                throw new Error(`movieUpsert: row ${input.movieId} not found`);
            }
            row = updated;
        } else {
            const [inserted] = await serverRuntime.db.insert(movies).values(payload).returning();
            if (!inserted) {
                throw new Error('movieUpsert: insert returned no rows');
            }
            row = inserted;
        }
        await serverRuntime.publish.userUpdates({ userId });
        return toGqlMovie(row);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
