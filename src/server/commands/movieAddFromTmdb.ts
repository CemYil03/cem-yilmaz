import { eq } from 'drizzle-orm';
import { movies } from '../db/schema';
import type { MovieCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationMovieAddFromTmdbArgs, GqlSMovie, GqlSSession } from '../graphql/generated';
import { toGqlMovie } from '../mappers/toGqlMovie';

// Fetches full detail from TMDB and either creates a new `Movies` row or
// refreshes the metadata on the row that already carries the same `tmdbId`
// (poster / release / runtime / overview may have changed since the last
// fetch). Status stays "watchlist" on a new row unless the caller passes
// something else; existing-row status is preserved (this call is about
// metadata, not lifecycle).
//
// Graceful degradation: when the TMDB client returns `null` (missing API
// key, network error, unknown id), fall through to a title-only insert
// using `tmdbId` as the placeholder title so the admin can rename via the
// normal edit form. See `docs/features/workspace-media.md`.
export async function movieAddFromTmdb(
    userId: string,
    args: GqlSAdminMutationMovieAddFromTmdbArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMovie> {
    const { tmdbId } = args;
    const status = args.status ?? 'watchlist';
    const now = new Date();

    try {
        const detail = await serverRuntime.tmdb.getMovie(tmdbId);

        // Dedupe against an existing row with the same `tmdbId`. Update
        // metadata in place; leave lifecycle fields (status, rating,
        // watchedAt, notes, topics) untouched.
        const [existing] = await serverRuntime.db.select().from(movies).where(eq(movies.tmdbId, tmdbId)).limit(1);

        if (existing) {
            const [updated] = await serverRuntime.db
                .update(movies)
                .set({
                    title: detail?.title ?? existing.title,
                    posterUrl: detail?.posterUrl ?? existing.posterUrl,
                    backdropUrl: detail?.backdropUrl ?? existing.backdropUrl,
                    releaseDate: detail?.releaseDate ?? existing.releaseDate,
                    runtimeMinutes: detail?.runtimeMinutes ?? existing.runtimeMinutes,
                    overview: detail?.overview ?? existing.overview,
                    updatedAt: now,
                })
                .where(eq(movies.movieId, existing.movieId))
                .returning();
            if (!updated) {
                throw new Error(`movieAddFromTmdb: refresh failed for tmdbId ${tmdbId}`);
            }
            await serverRuntime.publish.userUpdates({ userId });
            return toGqlMovie(updated);
        }

        const payload: MovieCreate = {
            movieId: crypto.randomUUID(),
            title: detail?.title ?? `TMDB #${tmdbId}`,
            tmdbId,
            posterUrl: detail?.posterUrl ?? null,
            backdropUrl: detail?.backdropUrl ?? null,
            releaseDate: detail?.releaseDate ?? null,
            runtimeMinutes: detail?.runtimeMinutes ?? null,
            overview: detail?.overview ?? null,
            status,
            rating: null,
            watchedAt: null,
            notes: null,
            topics: [],
            updatedAt: now,
        };
        const [inserted] = await serverRuntime.db.insert(movies).values(payload).returning();
        if (!inserted) {
            throw new Error('movieAddFromTmdb: insert returned no rows');
        }
        await serverRuntime.publish.userUpdates({ userId });
        return toGqlMovie(inserted);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
