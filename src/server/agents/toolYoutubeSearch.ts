import { tool } from 'ai';
import { z } from 'zod';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';

// Live YouTube channel search for the media sub-agent. Same underlying
// client the GraphQL `Admin.media.youtubeSearch` resolver uses. Empty
// result on missing key or YouTube outage — the sub-agent handles that
// by falling back to `mediaChannelUpsert` with whatever fields the user
// named directly.

const youtubeSearchInputSchema = z.object({
    query: z.string().min(1).max(200).describe('Free-form channel name or handle. YouTube matches loosely.'),
});

interface MediaAgentReadContext {
    serverRuntime: ServerRuntime;
    // Session is unused here (YouTube is a stateless third-party read),
    // but the read-context shape is uniform across every media tool so
    // the call site in `agentPersonalAssistantMedia` stays symmetric.
    session: GqlSSession;
}

export function toolYoutubeSearch({ serverRuntime }: MediaAgentReadContext) {
    return tool({
        description: [
            'Search YouTube for channels by name or handle. Returns up to 10 results with `channelId`, `title`,',
            '`handle`, `avatarUrl`, `description`, `subscriberCount`, and a pre-composed `canonicalUrl`. Use this',
            'BEFORE `mediaChannelUpsert` when Cem names a YouTube channel he does not have yet — feed the chosen',
            '`canonicalUrl` into `url`, `title` into `name`, `handle` into `handle`, and `avatarUrl` into',
            '`avatarUrl`. Empty results mean no match / no YouTube key / YouTube unreachable; in all three cases',
            'fall back to `mediaChannelUpsert` with whatever the user typed.',
        ].join(' '),
        inputSchema: youtubeSearchInputSchema,
        execute: async (input) => {
            return serverRuntime.youtube.searchChannels(input.query);
        },
    });
}
