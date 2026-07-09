import { desc, eq, inArray } from 'drizzle-orm';
import { mediaChannels } from '../db/schema';
import type { MediaChannelCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMediaChannelInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch upsert of favourite channels. Every input with a `channelId` is
// updated; every input without one is inserted. On insert, `priority`
// defaults to `max(priority) + 1` so a new channel lands at the bottom of
// every topic section it belongs to — the admin then drags it up via
// `mediaChannelReorder`. On update, `priority` is untouched here; the reorder
// mutation is the sole writer of that column. The whole batch runs inside a
// single transaction so a partial failure rolls back to zero writes.
// `referenceIds` echoes the id per input row (in input order).
export async function mediaChannelsUpsert(
    userId: string,
    inputs: readonly GqlSMediaChannelInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — partial payload construction. Insert `priority` is resolved
    // inside the transaction against the current tail so a batch of new rows
    // lands in stable, contiguous order.
    const rows = inputs.map((input) => {
        const channelId = input.channelId ?? crypto.randomUUID();
        return { channelId, isUpdate: Boolean(input.channelId), input };
    });

    // Phase 2 — transactional execution.
    try {
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.channelId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ channelId: mediaChannels.channelId })
                    .from(mediaChannels)
                    .where(inArray(mediaChannels.channelId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.channelId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`mediaChannelsUpsert: rows not found: ${missing.join(', ')}`);
                }
            }

            const [tail] = await transaction
                .select({ priority: mediaChannels.priority })
                .from(mediaChannels)
                .orderBy(desc(mediaChannels.priority))
                .limit(1);
            let nextPriority = (tail?.priority ?? -1) + 1;

            for (const row of rows) {
                const { input } = row;
                if (row.isUpdate) {
                    await transaction
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
                        .where(eq(mediaChannels.channelId, row.channelId));
                } else {
                    const payload: MediaChannelCreate = {
                        channelId: row.channelId,
                        name: input.name,
                        platform: input.platform,
                        url: input.url,
                        handle: input.handle ?? null,
                        avatarUrl: input.avatarUrl ?? null,
                        description: input.description ?? null,
                        topics: input.topics,
                        priority: nextPriority,
                        notes: input.notes ?? null,
                        updatedAt: now,
                    };
                    nextPriority += 1;
                    await transaction.insert(mediaChannels).values(payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.channelId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
