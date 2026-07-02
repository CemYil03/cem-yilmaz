import { tool } from 'ai';
import { z } from 'zod';
import { movieUpsert } from '../commands/movieUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSMovieStatusSchema } from '../graphql/generated';
import type { GqlSSession } from '../graphql/generated';
import type { MediaAgentMutationLog } from './agentPersonalAssistantMedia';
import { requireAdminUserId } from './requireAdminUserId';

// Direct create-or-edit. Prefer `movieAddFromTmdb` for new movies (auto-fills
// poster + metadata). This tool is for manual entries, edits to existing
// rows, or films TMDB has never heard of.
//
// Hand-built input schema — same rationale as `toolProjectUpsert.ts`:
// Gemini's structured output rejects `z.date()`, so ISO strings ride the
// wire and the `execute` converts.

const movieUpsertInputSchema = z.object({
    movieId: z.uuid().nullish().describe('Omit (or null) to create a new movie. Pass an existing id to edit.'),
    title: z.string().min(1).max(300).describe('Movie title.'),
    tmdbId: z.number().int().min(1).nullish().describe('Optional TMDB reference id.'),
    posterUrl: z.string().url().nullish().describe('Poster image URL. Typically from TMDB.'),
    backdropUrl: z.string().url().nullish(),
    releaseDate: z.string().nullish().describe('ISO date `YYYY-MM-DD`. Optional.'),
    runtimeMinutes: z.number().int().min(1).max(1000).nullish(),
    overview: z.string().max(4000).nullish(),
    status: GqlSMovieStatusSchema.describe('watchlist | watching | watched | dropped'),
    rating: z.number().int().min(1).max(10).nullish().describe("Cem's rating out of 10."),
    watchedAt: z.string().nullish().describe('ISO-8601 timestamp when Cem watched it. Only set for `status: watched`.'),
    notes: z.string().max(4000).nullish(),
    topics: z.array(z.string()).describe('Free-form genre / cluster tags. Empty array if none.'),
});

interface MediaAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: MediaAgentMutationLog;
}

export function toolMovieUpsert({ serverRuntime, session, mutations }: MediaAgentMutationContext) {
    return tool({
        description: [
            'Create or edit a movie directly. For NEW movies, prefer `movieAddFromTmdb` — it auto-fills poster,',
            'release date, runtime and overview from TMDB. Use this tool for: (a) edits to an existing row',
            '(rating, notes, topics), (b) manual entries when TMDB has no match, (c) status transitions other than',
            '"watched" (for "watched", prefer `movieMarkWatched`).',
        ].join(' '),
        inputSchema: movieUpsertInputSchema,
        execute: async (input) => {
            const result = await movieUpsert(
                requireAdminUserId(session),
                {
                    input: {
                        movieId: input.movieId ?? null,
                        title: input.title,
                        tmdbId: input.tmdbId ?? null,
                        posterUrl: input.posterUrl ?? null,
                        backdropUrl: input.backdropUrl ?? null,
                        releaseDate: input.releaseDate ?? null,
                        runtimeMinutes: input.runtimeMinutes ?? null,
                        overview: input.overview ?? null,
                        status: input.status,
                        rating: input.rating ?? null,
                        watchedAt: input.watchedAt ? new Date(input.watchedAt) : null,
                        notes: input.notes ?? null,
                        topics: input.topics,
                    },
                },
                session,
                serverRuntime,
            );
            mutations.push({
                kind: input.movieId ? 'movieUpdate' : 'movieAdd',
                id: result.movieId,
                title: result.title,
            });
            return result;
        },
    });
}
