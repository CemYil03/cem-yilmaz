import { tool } from 'ai';
import { z } from 'zod';
import { mediaChannelDelete } from '../commands/mediaChannelDelete';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { MediaAgentMutationLog } from './agentPersonalAssistantMedia';
import { requireAdminUserId } from './requireAdminUserId';

const mediaChannelDeleteInputSchema = z.object({
    channelId: z.uuid().describe('Channel row id to delete.'),
});

interface MediaAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: MediaAgentMutationLog;
}

export function toolMediaChannelDelete({ serverRuntime, session, mutations }: MediaAgentMutationContext) {
    return tool({
        description: 'Permanently delete a channel from the favourites list. No soft-delete.',
        inputSchema: mediaChannelDeleteInputSchema,
        execute: async (input) => {
            const result = await mediaChannelDelete(requireAdminUserId(session), { channelId: input.channelId }, session, serverRuntime);
            mutations.push({ kind: 'mediaChannelDelete', id: input.channelId });
            return result;
        },
    });
}
