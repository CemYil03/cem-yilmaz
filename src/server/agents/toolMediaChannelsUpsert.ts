import { tool } from 'ai';
import { z } from 'zod';
import { adminMediaChannelsUpsert } from '../commands/adminMediaChannelsUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminMediaChannelInputSchema } from '../graphql/generated';
import type { GqlSAdminMediaChannelInput, GqlSSession } from '../graphql/generated';
import type { MediaAgentMutationLog } from './agentPersonalAssistantMedia';
import { requireAdminUserId } from './requireAdminUserId';

// Batch create-or-edit of favourite YouTube / Twitch / podcast / other
// channels. Each row is `GqlSAdminMediaChannelInputSchema()` — same shape the
// GraphQL resolver validates. Gemini-safe: no `DateTime` fields.
const toolMediaChannelsUpsertInputSchema = z.object({
    mediaChannels: z.array(GqlSAdminMediaChannelInputSchema()).min(1),
});

interface MediaAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: MediaAgentMutationLog;
}

export function toolMediaChannelsUpsert({ serverRuntime, session, mutations }: MediaAgentMutationContext) {
    return tool({
        description: [
            'Batch create-or-edit of favourite YouTube / Twitch / podcast / other channels.',
            'For NEW channels, omit `channelId` — the server allocates one and appends the row to the bottom of',
            'every topic section. For an EDIT, pass the id from the snapshot or a prior `mediaChannelsList` call.',
            '`topics` is the clustering axis — cluster tags like `tech`, `ai`, `movieCritic`, `entertainment`. A',
            'channel can carry multiple tags; e.g. a tech YouTuber who also reviews films. `/workspace/software` reads',
            'channels tagged `tech`, so keep the vocabulary consistent (see the snapshot). `platform` is one of',
            '`youtube | twitch | podcast | other`. Batch same-shape writes into one call. Returns `referenceIds` in',
            'input order.',
        ].join(' '),
        inputSchema: toolMediaChannelsUpsertInputSchema,
        execute: async (rawInput) => {
            const inputs = rawInput.mediaChannels as GqlSAdminMediaChannelInput[];
            const result = await adminMediaChannelsUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
            const referenceIds = result.referenceIds ?? [];
            inputs.forEach((channel, index) => {
                mutations.push({
                    kind: channel.channelId ? 'mediaChannelUpdate' : 'mediaChannelAdd',
                    id: referenceIds[index] ?? channel.channelId ?? '',
                    title: channel.name,
                });
            });
            return result;
        },
    });
}
