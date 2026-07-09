import { eq } from 'drizzle-orm';
import { movies } from '../db/schema';
import type { MovieCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMovieAddFromTmdbInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch add of movies by TMDB id. Each input either creates a new `Movies`
// row or refreshes the metadata on the row that already carries the same
// `tmdbId` (poster / release / runtime / overview may have changed since the
// last fetch). Status stays "watchlist" on a new row unless the caller passes
// something else; existing-row status is preserved (this call is about
// metadata, not lifecycle).
//
// The TMDB fetches happen OUTSIDE the transaction (in parallel); only the DB
// writes run inside it so a partial failure rolls back to zero writes.
// `referenceIds` echoes the resolved `movieId` per input in input order.
//
// Graceful degradation: when the TMDB client returns `null` (missing API key,
// network error, unknown id), fall through to a title-only insert using
// `TMDB #<id>` as the placeholder title so the admin can rename via the normal
// edit form. See `docs/features/workspace-media.md`.
export async function moviesAddFromTmdb(
    userId: string,
    inputs: readonly GqlSMovieAddFromTmdbInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    try {
        // Phase 1 — TMDB fetches in parallel, outside the transaction.
        const details = await Promise.all(inputs.map((input) => serverRuntime.tmdb.getMovie(input.tmdbId)));

        // Phase 2 — transactional DB writes.
        const referenceIds: string[] = [];
        await serverRuntime.db.transaction(async (transaction) => {
            for (let index = 0; index < inputs.length; index += 1) {
                const input = inputs[index]!;
                const detail = details[index];
                const status = input.status ?? 'watchlist';

                const [existing] = await transaction.select().from(movies).where(eq(movies.tmdbId, input.tmdbId)).limit(1);

                if (existing) {
                    const [updated] = await transaction
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
                        .returning({ movieId: movies.movieId });
                    if (!updated) {
                        throw new Error(`moviesAddFromTmdb: refresh failed for tmdbId ${input.tmdbId}`);
                    }
                    referenceIds.push(updated.movieId);
                    continue;
                }

                const payload: MovieCreate = {
                    movieId: crypto.randomUUID(),
                    title: detail?.title ?? `TMDB #${input.tmdbId}`,
                    tmdbId: input.tmdbId,
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
                const [inserted] = await transaction.insert(movies).values(payload).returning({ movieId: movies.movieId });
                if (!inserted) {
                    throw new Error('moviesAddFromTmdb: insert returned no rows');
                }
                referenceIds.push(inserted.movieId);
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
