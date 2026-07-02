import type { MediaChannel } from '../db/schema';
import type { GqlSMediaChannel } from '../graphql/generated';

export function toGqlMediaChannel(row: MediaChannel): GqlSMediaChannel {
    return {
        channelId: row.channelId,
        name: row.name,
        platform: row.platform,
        url: row.url,
        handle: row.handle,
        avatarUrl: row.avatarUrl,
        description: row.description,
        topics: row.topics,
        priority: row.priority,
        notes: row.notes,
        updatedAt: row.updatedAt,
    };
}
