import { tool } from 'ai';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { movies } from '../db/schema';
import type { AdminMediaMovieCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminMediaMovieStatusSchema } from '../graphql/generated';
import type { GqlSAdminMediaMovieAddFromTmdbInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

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
export async function adminMediaMoviesAddFromTmdb(
    userId: string,
    inputs: readonly GqlSAdminMediaMovieAddFromTmdbInput[],
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
                        throw new Error(`adminMediaMoviesAddFromTmdb: refresh failed for tmdbId ${input.tmdbId}`);
                    }
                    referenceIds.push(updated.movieId);
                    continue;
                }

                const payload: AdminMediaMovieCreate = {
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
                    throw new Error('adminMediaMoviesAddFromTmdb: insert returned no rows');
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

const movieAddItemSchema = z.object({
    tmdbId: z.number().int().min(1).describe('TMDB movie id, from an earlier `tmdbSearch` result.'),
    status: GqlSAdminMediaMovieStatusSchema.optional().describe(
        'Starting status for the new movie. Defaults to `watchlist`. Use `watched` when Cem is adding a film he already saw.',
    ),
});

const toolMoviesAddFromTmdbInputSchema = z.object({
    inputs: z.array(movieAddItemSchema).min(1).describe('One or more TMDB movies to add. Batch a whole set of adds into one call.'),
});

interface MediaAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolMoviesAddFromTmdb({ serverRuntime, session }: MediaAgentToolContext) {
    return tool({
        description: [
            'Batch add movies to the library by TMDB id (poster, release, runtime, overview auto-filled). Preferred',
            'add path over `moviesUpsert`. If a movie with the same `tmdbId` already exists, this refreshes metadata',
            'without duplicating and returns that same row. Returns `referenceIds` (the resolved movie ids) in input',
            'order.',
        ].join(' '),
        inputSchema: toolMoviesAddFromTmdbInputSchema,
        execute: async (input) => {
            const inputs: GqlSAdminMediaMovieAddFromTmdbInput[] = input.inputs.map((entry) => ({
                tmdbId: entry.tmdbId,
                status: entry.status ?? null,
            }));
            return adminMediaMoviesAddFromTmdb(requireAdminUserId(session), inputs, session, serverRuntime);
        },
    });
}
