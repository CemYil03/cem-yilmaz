import { eq, inArray } from 'drizzle-orm';
import { movies } from '../db/schema';
import type { AdminMediaMovieCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMediaMovieInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch upsert of movies. Every input with a `movieId` is updated; every
// input without one is inserted under a freshly-minted UUID. The whole batch
// runs inside a single transaction so a partial failure rolls back to zero
// writes. `referenceIds` echoes the id per input row (in input order) so the
// caller can address newly-created rows without a follow-up read.
//
// `tmdbId` uniqueness is a table-level constraint (`Movies_tmdbId_key`), so a
// re-insert of the same TMDB movie would fail here — `adminMediaMoviesAddFromTmdb`
// looks the row up first and updates it. Manual entries pass `tmdbId: null`
// and are duplicate-friendly. Marking a movie watched is a one-element
// upsert with `status: 'watched'` and `watchedAt` set.
export async function adminMediaMoviesUpsert(
    userId: string,
    inputs: readonly GqlSAdminMediaMovieInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction.
    const rows = inputs.map((input) => {
        const movieId = input.movieId ?? crypto.randomUUID();
        const payload: AdminMediaMovieCreate = {
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
        return { movieId, isUpdate: Boolean(input.movieId), payload };
    });

    // Phase 2 — transactional execution.
    try {
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.movieId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ movieId: movies.movieId })
                    .from(movies)
                    .where(inArray(movies.movieId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.movieId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`adminMediaMoviesUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction.update(movies).set(row.payload).where(eq(movies.movieId, row.movieId));
                } else {
                    await transaction.insert(movies).values(row.payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.movieId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
