import { eq } from 'drizzle-orm';
import { mediaChannels } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationMediaChannelReorderArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Rewrites `priority` on the given channel ids in array order (index 0 =
// priority 0 = topmost). The caller scopes the list to a single topic
// bucket; the server does not enforce single-topic membership so a channel
// with `topics=['tech','ai']` can appear in both sections and be reordered
// under each independently (the last reorder wins for that channel's
// priority). Matches the CV `*Reorder` shape.
export async function mediaChannelReorder(
    userId: string,
    args: GqlSAdminMutationMediaChannelReorderArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        await serverRuntime.db.transaction(async (transaction) => {
            for (let priority = 0; priority < args.orderedIds.length; priority++) {
                const channelId = args.orderedIds[priority]!;
                await transaction
                    .update(mediaChannels)
                    .set({ priority, updatedAt: new Date() })
                    .where(eq(mediaChannels.channelId, channelId));
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
