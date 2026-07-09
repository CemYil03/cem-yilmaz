import { tool } from 'ai';
import { z } from 'zod';
import { moviesAddFromTmdb } from '../commands/moviesAddFromTmdb';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSMovieStatusSchema } from '../graphql/generated';
import type { GqlSMovieAddFromTmdbInput, GqlSSession } from '../graphql/generated';
import type { MediaAgentMutationLog } from './agentPersonalAssistantMedia';
import { requireAdminUserId } from './requireAdminUserId';

const movieAddItemSchema = z.object({
    tmdbId: z.number().int().min(1).describe('TMDB movie id, from an earlier `tmdbSearch` result.'),
    status: GqlSMovieStatusSchema.optional().describe(
        'Starting status for the new movie. Defaults to `watchlist`. Use `watched` when Cem is adding a film he already saw.',
    ),
});

const toolMoviesAddFromTmdbInputSchema = z.object({
    inputs: z.array(movieAddItemSchema).min(1).describe('One or more TMDB movies to add. Batch a whole set of adds into one call.'),
});

interface MediaAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: MediaAgentMutationLog;
}

export function toolMoviesAddFromTmdb({ serverRuntime, session, mutations }: MediaAgentMutationContext) {
    return tool({
        description: [
            'Batch add movies to the library by TMDB id (poster, release, runtime, overview auto-filled). Preferred',
            'add path over `moviesUpsert`. If a movie with the same `tmdbId` already exists, this refreshes metadata',
            'without duplicating and returns that same row. Returns `referenceIds` (the resolved movie ids) in input',
            'order.',
        ].join(' '),
        inputSchema: toolMoviesAddFromTmdbInputSchema,
        execute: async (input) => {
            const inputs: GqlSMovieAddFromTmdbInput[] = input.inputs.map((entry) => ({
                tmdbId: entry.tmdbId,
                status: entry.status ?? null,
            }));
            const result = await moviesAddFromTmdb(requireAdminUserId(session), inputs, session, serverRuntime);
            const referenceIds = result.referenceIds ?? [];
            input.inputs.forEach((_entry, index) => {
                mutations.push({ kind: 'movieAdd', id: referenceIds[index] ?? '' });
            });
            return result;
        },
    });
}
