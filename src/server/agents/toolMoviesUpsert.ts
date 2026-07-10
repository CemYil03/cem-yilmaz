import { tool } from 'ai';
import { z } from 'zod';
import { adminMediaMoviesUpsert } from '../commands/adminMediaMoviesUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminMediaMovieStatusSchema } from '../graphql/generated';
import type { GqlSAdminMediaMovieInput, GqlSSession } from '../graphql/generated';
import type { MediaAgentMutationLog } from './agentPersonalAssistantMedia';
import { requireAdminUserId } from './requireAdminUserId';

// Batch create-or-edit of movies. Prefer `moviesAddFromTmdb` for new movies
// (auto-fills poster + metadata). This tool is for manual entries, edits to
// existing rows, films TMDB has never heard of, and marking a movie watched
// (upsert with `status: watched` and `watchedAt` set).
//
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

interface MediaAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: MediaAgentMutationLog;
}

export function toolMoviesUpsert({ serverRuntime, session, mutations }: MediaAgentMutationContext) {
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
            const result = await adminMediaMoviesUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
            const referenceIds = result.referenceIds ?? [];
            input.movies.forEach((movie, index) => {
                mutations.push({
                    kind: movie.movieId ? 'movieUpdate' : 'movieAdd',
                    id: referenceIds[index] ?? movie.movieId ?? '',
                    title: movie.title,
                });
            });
            return result;
        },
    });
}
