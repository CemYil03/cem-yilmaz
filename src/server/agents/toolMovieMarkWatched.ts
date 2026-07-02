import { tool } from 'ai';
import { z } from 'zod';
import { movieMarkWatched } from '../commands/movieMarkWatched';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { MediaAgentMutationLog } from './agentPersonalAssistantMedia';
import { requireAdminUserId } from './requireAdminUserId';

const movieMarkWatchedInputSchema = z.object({
    movieId: z.uuid().describe('Existing movie row id.'),
    rating: z.number().int().min(1).max(10).nullish().describe("Cem's rating out of 10. Optional."),
});

interface MediaAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: MediaAgentMutationLog;
}

export function toolMovieMarkWatched({ serverRuntime, session, mutations }: MediaAgentMutationContext) {
    return tool({
        description: [
            'Mark a movie as watched. Flips status to `watched`, stamps `watchedAt` to now, optionally writes a',
            'rating (1..10). Prefer this over `movieUpsert` for the common "I watched X" case — leaves every',
            'other field alone.',
        ].join(' '),
        inputSchema: movieMarkWatchedInputSchema,
        execute: async (input) => {
            const result = await movieMarkWatched(
                requireAdminUserId(session),
                { movieId: input.movieId, rating: input.rating ?? null },
                session,
                serverRuntime,
            );
            mutations.push({ kind: 'movieMarkWatched', id: result.movieId, title: result.title });
            return result;
        },
    });
}
