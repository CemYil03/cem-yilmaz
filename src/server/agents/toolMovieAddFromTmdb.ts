import { tool } from 'ai';
import { z } from 'zod';
import { movieAddFromTmdb } from '../commands/movieAddFromTmdb';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSMovieStatusSchema } from '../graphql/generated';
import type { GqlSSession } from '../graphql/generated';
import type { MediaAgentMutationLog } from './agentPersonalAssistantMedia';
import { requireAdminUserId } from './requireAdminUserId';

const movieAddFromTmdbInputSchema = z.object({
    tmdbId: z.number().int().min(1).describe('TMDB movie id, from an earlier `tmdbSearch` result.'),
    status: GqlSMovieStatusSchema.optional().describe(
        'Starting status for the new movie. Defaults to `watchlist`. Use `watched` when Cem is adding a film he already saw.',
    ),
});

interface MediaAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: MediaAgentMutationLog;
}

export function toolMovieAddFromTmdb({ serverRuntime, session, mutations }: MediaAgentMutationContext) {
    return tool({
        description: [
            'Add a movie to the library by TMDB id (poster, release, runtime, overview auto-filled). Preferred add',
            'path over `movieUpsert`. If a movie with the same `tmdbId` already exists, this refreshes metadata',
            'without duplicating and returns that same row.',
        ].join(' '),
        inputSchema: movieAddFromTmdbInputSchema,
        execute: async (input) => {
            const result = await movieAddFromTmdb(
                requireAdminUserId(session),
                { tmdbId: input.tmdbId, status: input.status ?? null },
                session,
                serverRuntime,
            );
            mutations.push({ kind: 'movieAdd', id: result.movieId, title: result.title });
            return result;
        },
    });
}
