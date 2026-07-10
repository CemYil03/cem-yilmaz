import type { AdminMediaChannel } from '../db/schema';
import type { GqlSAdminMediaChannel } from '../graphql/generated';

export function toGqlAdminMediaChannel(row: AdminMediaChannel): GqlSAdminMediaChannel {
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
