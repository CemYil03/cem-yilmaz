import { tool } from 'ai';
import { z } from 'zod';
import { adminMediaChannelsDelete } from '../commands/adminMediaChannelsDelete';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { MediaAgentMutationLog } from './agentPersonalAssistantMedia';
import { requireAdminUserId } from './requireAdminUserId';

const toolMediaChannelsDeleteInputSchema = z.object({
    channelIds: z.array(z.uuid()).min(1).describe('Channel row ids to delete.'),
});

interface MediaAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: MediaAgentMutationLog;
}

export function toolMediaChannelsDelete({ serverRuntime, session, mutations }: MediaAgentMutationContext) {
    return tool({
        description: 'Permanently delete one or more channels from the favourites list. No soft-delete.',
        inputSchema: toolMediaChannelsDeleteInputSchema,
        execute: async (input) => {
            const result = await adminMediaChannelsDelete(requireAdminUserId(session), input.channelIds, session, serverRuntime);
            for (const channelId of input.channelIds) mutations.push({ kind: 'mediaChannelDelete', id: channelId });
            return result;
        },
    });
}
