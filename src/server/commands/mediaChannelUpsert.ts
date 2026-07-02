import { desc, eq } from 'drizzle-orm';
import { mediaChannels } from '../db/schema';
import type { MediaChannelCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationMediaChannelUpsertArgs, GqlSMediaChannel, GqlSSession } from '../graphql/generated';
import { toGqlMediaChannel } from '../mappers/toGqlMediaChannel';

// Two-phase upsert. `channelId` set → update; absent → insert. On insert,
// `priority` defaults to `max(priority) + 1` so a new channel lands at the
// bottom of every topic section it belongs to — the admin then drags it up
// via `mediaChannelReorder`. On update, `priority` is untouched here; the
// reorder mutation is the sole writer of that column.
export async function mediaChannelUpsert(
    userId: string,
    args: GqlSAdminMutationMediaChannelUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMediaChannel> {
    const { input } = args;
    const now = new Date();

    try {
        let row;
        if (input.channelId) {
            const [updated] = await serverRuntime.db
                .update(mediaChannels)
                .set({
                    name: input.name,
                    platform: input.platform,
                    url: input.url,
                    handle: input.handle ?? null,
                    avatarUrl: input.avatarUrl ?? null,
                    description: input.description ?? null,
                    topics: input.topics,
                    notes: input.notes ?? null,
                    updatedAt: now,
                })
                .where(eq(mediaChannels.channelId, input.channelId))
                .returning();
            if (!updated) {
                throw new Error(`mediaChannelUpsert: row ${input.channelId} not found`);
            }
            row = updated;
        } else {
            const [tail] = await serverRuntime.db
                .select({ priority: mediaChannels.priority })
                .from(mediaChannels)
                .orderBy(desc(mediaChannels.priority))
                .limit(1);
            const priority = (tail?.priority ?? -1) + 1;
            const payload: MediaChannelCreate = {
                channelId: crypto.randomUUID(),
                name: input.name,
                platform: input.platform,
                url: input.url,
                handle: input.handle ?? null,
                avatarUrl: input.avatarUrl ?? null,
                description: input.description ?? null,
                topics: input.topics,
                priority,
                notes: input.notes ?? null,
                updatedAt: now,
            };
            const [inserted] = await serverRuntime.db.insert(mediaChannels).values(payload).returning();
            if (!inserted) {
                throw new Error('mediaChannelUpsert: insert returned no rows');
            }
            row = inserted;
        }
        await serverRuntime.publish.userUpdates({ userId });
        return toGqlMediaChannel(row);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
