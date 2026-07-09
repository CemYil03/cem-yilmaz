import { inArray } from 'drizzle-orm';
import { mediaChannels } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch delete of favourite channels. `referenceIds` echoes the deleted ids
// in input order — a caller-supplied id that never existed makes the batch
// throw (same posture as the singular delete had).
export async function mediaChannelsDelete(
    userId: string,
    channelIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(mediaChannels)
            .where(inArray(mediaChannels.channelId, channelIds as string[]))
            .returning({ channelId: mediaChannels.channelId });
        if (deleted.length !== channelIds.length) {
            const found = new Set(deleted.map((row) => row.channelId));
            const missing = channelIds.filter((id) => !found.has(id));
            throw new Error(`mediaChannelsDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...channelIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
