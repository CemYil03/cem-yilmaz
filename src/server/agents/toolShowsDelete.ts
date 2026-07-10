import { tool } from 'ai';
import { z } from 'zod';
import { adminMediaShowsDelete } from '../commands/adminMediaShowsDelete';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { MediaAgentMutationLog } from './agentPersonalAssistantMedia';
import { requireAdminUserId } from './requireAdminUserId';

const toolShowsDeleteInputSchema = z.object({
    showIds: z.array(z.uuid()).min(1).describe('Ids of the series to delete.'),
});

interface MediaAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: MediaAgentMutationLog;
}

export function toolShowsDelete({ serverRuntime, session, mutations }: MediaAgentMutationContext) {
    return tool({
        description: 'Permanently delete one or more TV series from the library. Irreversible — confirm intent before calling.',
        inputSchema: toolShowsDeleteInputSchema,
        execute: async (input) => {
            const result = await adminMediaShowsDelete(requireAdminUserId(session), input.showIds, session, serverRuntime);
            for (const showId of input.showIds) mutations.push({ kind: 'showDelete', id: showId });
            return result;
        },
    });
}
