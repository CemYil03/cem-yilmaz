import { tool } from 'ai';
import { z } from 'zod';
import { mediaChannelUpsert } from '../commands/mediaChannelUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSMediaPlatformSchema } from '../graphql/generated';
import type { GqlSSession } from '../graphql/generated';
import type { MediaAgentMutationLog } from './agentPersonalAssistantMedia';
import { requireAdminUserId } from './requireAdminUserId';

const mediaChannelUpsertInputSchema = z.object({
    channelId: z.uuid().nullish().describe('Omit to create; pass an existing id to edit.'),
    name: z.string().min(1).max(200).describe('Channel display name.'),
    platform: GqlSMediaPlatformSchema.describe('youtube | twitch | podcast | other'),
    url: z.url().describe("Canonical URL to the channel's home page."),
    handle: z.string().max(80).nullish().describe('Public handle, e.g. `@fireship`.'),
    avatarUrl: z.url().nullish(),
    description: z.string().max(1000).nullish(),
    topics: z
        .array(z.string())
        .describe(
            'Cluster tags: `tech`, `ai`, `movieCritic`, `entertainment`, etc. A channel can carry multiple; e.g. a tech YouTuber who also reviews films.',
        ),
    notes: z.string().max(2000).nullish(),
});

interface MediaAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: MediaAgentMutationLog;
}

export function toolMediaChannelUpsert({ serverRuntime, session, mutations }: MediaAgentMutationContext) {
    return tool({
        description: [
            'Create or edit a favourite YouTube / Twitch / podcast / other channel.',
            'For NEW channels, omit `channelId` — the server allocates one and appends the row to the bottom of',
            'every topic section. For an EDIT, pass the id from the snapshot or a prior `mediaChannelsList` call.',
            '`topics` is the clustering axis — `/workspace/software` reads channels tagged `tech`, so keep the',
            'vocabulary consistent (see the snapshot).',
        ].join(' '),
        inputSchema: mediaChannelUpsertInputSchema,
        execute: async (input) => {
            const result = await mediaChannelUpsert(
                requireAdminUserId(session),
                {
                    input: {
                        channelId: input.channelId ?? null,
                        name: input.name,
                        platform: input.platform,
                        url: input.url,
                        handle: input.handle ?? null,
                        avatarUrl: input.avatarUrl ?? null,
                        description: input.description ?? null,
                        topics: input.topics,
                        notes: input.notes ?? null,
                    },
                },
                session,
                serverRuntime,
            );
            mutations.push({
                kind: input.channelId ? 'mediaChannelUpdate' : 'mediaChannelAdd',
                id: result.channelId,
                title: result.name,
            });
            return result;
        },
    });
}
