import { asc, sql } from 'drizzle-orm';
import { mediaChannels } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMediaChannel, GqlSSession } from '../graphql/generated';
import { toGqlMediaChannel } from '../mappers/toGqlMediaChannel';

// All favourite channels, or a filtered subset when `topic` is provided.
//
// When `topic` is null / undefined / empty the query returns every channel
// ordered by admin-set `priority` (ascending) then `name` as a tiebreak.
// When `topic` is a non-empty string the result is filtered to channels
// whose `topics` array contains it (case-sensitive `= ANY(...)` match) and
// ordered the same way. Powers both the `/workspace/media` full channel list
// and the `/workspace/software` "favourite tech YouTubers" section.
//
// See `docs/features/workspace-media.md`.
export async function adminMediaChannelFindMany(
    topic: string | null | undefined,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMediaChannel[]> {
    const trimmedTopic = topic?.trim() ?? '';
    try {
        const query = serverRuntime.db.select().from(mediaChannels);
        const ordered = trimmedTopic
            ? query.where(sql`${trimmedTopic} = ANY(${mediaChannels.topics})`).orderBy(asc(mediaChannels.priority), asc(mediaChannels.name))
            : query.orderBy(asc(mediaChannels.priority), asc(mediaChannels.name));
        const rows = await ordered;
        return rows.map(toGqlMediaChannel);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
