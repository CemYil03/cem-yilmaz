import { eq } from 'drizzle-orm';
import { mediaChannels } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationMediaChannelDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

export async function mediaChannelDelete(
    userId: string,
    args: GqlSAdminMutationMediaChannelDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(mediaChannels)
            .where(eq(mediaChannels.channelId, args.channelId))
            .returning({ channelId: mediaChannels.channelId });
        if (deleted.length === 0) {
            throw new Error(`mediaChannelDelete: row ${args.channelId} not found`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
