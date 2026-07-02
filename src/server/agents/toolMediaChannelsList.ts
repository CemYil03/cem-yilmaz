import { tool } from 'ai';
import { z } from 'zod';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { mediaChannelList } from '../queries/mediaChannelList';
import { mediaChannelsByTopic } from '../queries/mediaChannelsByTopic';

const mediaChannelsListInputSchema = z.object({
    topic: z.string().nullish().describe('Optional: narrow to channels tagged with this topic (case-sensitive). Omit for the full list.'),
});

interface MediaAgentReadContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolMediaChannelsList({ serverRuntime, session }: MediaAgentReadContext) {
    return tool({
        description: [
            'List favourite YouTube / Twitch / podcast channels with their topics, urls, and notes.',
            'Use when the snapshot in the prompt lacks a field the ask needs (url, description, notes) or when Cem',
            'wants channels for a specific topic ("my favourite tech YouTubers" → pass topic="tech").',
        ].join(' '),
        inputSchema: mediaChannelsListInputSchema,
        execute: async (input) => {
            if (input.topic) return mediaChannelsByTopic(input.topic, session, serverRuntime);
            return mediaChannelList(session, serverRuntime);
        },
    });
}
