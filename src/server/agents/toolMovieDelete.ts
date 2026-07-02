import { tool } from 'ai';
import { z } from 'zod';
import { movieDelete } from '../commands/movieDelete';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { MediaAgentMutationLog } from './agentPersonalAssistantMedia';
import { requireAdminUserId } from './requireAdminUserId';

const movieDeleteInputSchema = z.object({
    movieId: z.uuid().describe('Movie row id to delete.'),
});

interface MediaAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: MediaAgentMutationLog;
}

export function toolMovieDelete({ serverRuntime, session, mutations }: MediaAgentMutationContext) {
    return tool({
        description:
            'Permanently delete a movie from the library. There is no soft-delete. Prefer `movieUpsert` with `status: dropped` if the user is only losing interest.',
        inputSchema: movieDeleteInputSchema,
        execute: async (input) => {
            const result = await movieDelete(requireAdminUserId(session), { movieId: input.movieId }, session, serverRuntime);
            mutations.push({ kind: 'movieDelete', id: input.movieId });
            return result;
        },
    });
}
