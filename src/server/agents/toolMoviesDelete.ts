import { tool } from 'ai';
import { z } from 'zod';
import { adminMediaMoviesDelete } from '../commands/adminMediaMoviesDelete';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { MediaAgentMutationLog } from './agentPersonalAssistantMedia';
import { requireAdminUserId } from './requireAdminUserId';

const toolMoviesDeleteInputSchema = z.object({
    movieIds: z.array(z.uuid()).min(1).describe('AdminMediaMovie row ids to delete.'),
});

interface MediaAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: MediaAgentMutationLog;
}

export function toolMoviesDelete({ serverRuntime, session, mutations }: MediaAgentMutationContext) {
    return tool({
        description:
            'Permanently delete one or more movies from the library. There is no soft-delete. Prefer `moviesUpsert` with `status: dropped` if Cem is only losing interest.',
        inputSchema: toolMoviesDeleteInputSchema,
        execute: async (input) => {
            const result = await adminMediaMoviesDelete(requireAdminUserId(session), input.movieIds, session, serverRuntime);
            for (const movieId of input.movieIds) mutations.push({ kind: 'movieDelete', id: movieId });
            return result;
        },
    });
}
