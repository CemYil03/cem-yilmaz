import { asc } from 'drizzle-orm';
import { mediaChannels } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMediaChannel, GqlSSession } from '../graphql/generated';
import { toGqlMediaChannel } from '../mappers/toGqlMediaChannel';

// Every favourite channel, ordered by admin-set `priority` (ascending: lower
// number = higher up the page), then `name` as a tiebreak. The media page
// groups the returned list by topic client-side — a single channel with
// `topics=['tech','ai']` appears in both sections and reorder within either
// section rewrites the same `priority` column (last write wins). See
// `docs/features/workspace-media.md`.
export async function mediaChannelList(requestingSession: GqlSSession, serverRuntime: ServerRuntime): Promise<GqlSMediaChannel[]> {
    try {
        const rows = await serverRuntime.db.select().from(mediaChannels).orderBy(asc(mediaChannels.priority), asc(mediaChannels.name));
        return rows.map(toGqlMediaChannel);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
