import { asc, sql } from 'drizzle-orm';
import { mediaChannels } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMediaChannel, GqlSSession } from '../graphql/generated';
import { toGqlMediaChannel } from '../mappers/toGqlMediaChannel';

// Filters channels whose `topics` array contains `topic`. Case-sensitive
// match against the `text[]` column via Postgres `ANY`. Powers the
// `/workspace/software` "favourite tech YouTubers" section — the topic
// column IS the referent (no FK, no join table); the media page and the
// software page compose off the same list without duplicating channel data.
// See `docs/features/workspace-media.md`.
export async function mediaChannelsByTopic(
    topic: string,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMediaChannel[]> {
    try {
        const rows = await serverRuntime.db
            .select()
            .from(mediaChannels)
            .where(sql`${topic} = ANY(${mediaChannels.topics})`)
            .orderBy(asc(mediaChannels.priority), asc(mediaChannels.name));
        return rows.map(toGqlMediaChannel);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
