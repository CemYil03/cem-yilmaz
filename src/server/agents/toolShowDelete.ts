import { tool } from 'ai';
import { z } from 'zod';
import { showDelete } from '../commands/showDelete';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { MediaAgentMutationLog } from './agentPersonalAssistantMedia';
import { requireAdminUserId } from './requireAdminUserId';

const showDeleteInputSchema = z.object({
    showId: z.uuid().describe('Id of the series to delete.'),
    title: z.string().optional().describe('Optional title for narration; not used by the command.'),
});

interface MediaAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: MediaAgentMutationLog;
}

export function toolShowDelete({ serverRuntime, session, mutations }: MediaAgentMutationContext) {
    return tool({
        description: 'Permanently delete a TV series from the library. Irreversible — confirm intent before calling.',
        inputSchema: showDeleteInputSchema,
        execute: async (input) => {
            await showDelete(requireAdminUserId(session), { showId: input.showId }, session, serverRuntime);
            mutations.push({ kind: 'showDelete', id: input.showId, title: input.title });
            return { success: true, showId: input.showId };
        },
    });
}
