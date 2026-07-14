import { tool } from 'ai';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { movies } from '../db/schema';
import type { AdminMediaMovieCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminMediaMovieStatusSchema } from '../graphql/generated';
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

// Hand-built item schema — same rationale as `toolProjectUpsert.ts`: Gemini's
// structured output rejects `z.date()`, so `watchedAt` rides the wire as an
// ISO string and the `execute` converts with `new Date(...)`. Only the
// GraphQL enum schema (`GqlSAdminMediaMovieStatusSchema`) is reused so a future status
// addition surfaces as a TS error here rather than a runtime mismatch.

const movieItemSchema = z.object({
    movieId: z.uuid().nullish().describe('Omit (or null) to create a new movie. Pass an existing id to edit.'),
    title: z.string().min(1).max(300).describe('AdminMediaMovie title.'),
    tmdbId: z.number().int().min(1).nullish().describe('Optional TMDB reference id.'),
    posterUrl: z.url().nullish().describe('Poster image URL. Typically from TMDB.'),
    backdropUrl: z.url().nullish(),
    releaseDate: z.string().nullish().describe('ISO date `YYYY-MM-DD`. Optional.'),
    runtimeMinutes: z.number().int().min(1).max(1000).nullish(),
    overview: z.string().max(4000).nullish(),
    status: GqlSAdminMediaMovieStatusSchema.describe('watchlist | watching | watched | dropped'),
    rating: z.number().int().min(1).max(10).nullish().describe("Cem's rating out of 10."),
    watchedAt: z.string().nullish().describe('ISO-8601 timestamp when Cem watched it. Only set for `status: watched`.'),
    notes: z.string().max(4000).nullish(),
    topics: z.array(z.string()).describe('Free-form genre / cluster tags. Empty array if none.'),
});

const toolMoviesUpsertInputSchema = z.object({
    movies: z.array(movieItemSchema).min(1).describe('One or more movies to create or edit. Pass a one-element array for a single edit.'),
});

interface MediaAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolMoviesUpsert({ serverRuntime, session }: MediaAgentToolContext) {
    return tool({
        description: [
            'Batch create-or-edit of movies. For NEW movies, prefer `moviesAddFromTmdb` — it auto-fills poster,',
            'release date, runtime and overview from TMDB. Use this tool for: (a) edits to existing rows',
            '(rating, notes, topics), (b) manual entries when TMDB has no match, (c) status transitions including',
            '"watched" — to mark watched, set `status: watched` and `watchedAt` to now. Every row with a `movieId`',
            'is updated; every row without one is inserted. Batch same-shape writes into one call. Returns',
            '`referenceIds` in input order.',
        ].join(' '),
        inputSchema: toolMoviesUpsertInputSchema,
        execute: async (input) => {
            const inputs: GqlSAdminMediaMovieInput[] = input.movies.map((movie) => ({
                movieId: movie.movieId ?? null,
                title: movie.title,
                tmdbId: movie.tmdbId ?? null,
                posterUrl: movie.posterUrl ?? null,
                backdropUrl: movie.backdropUrl ?? null,
                releaseDate: movie.releaseDate ?? null,
                runtimeMinutes: movie.runtimeMinutes ?? null,
                overview: movie.overview ?? null,
                status: movie.status,
                rating: movie.rating ?? null,
                watchedAt: movie.watchedAt ? new Date(movie.watchedAt) : null,
                notes: movie.notes ?? null,
                topics: movie.topics,
            }));
            return adminMediaMoviesUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
        },
    });
}
