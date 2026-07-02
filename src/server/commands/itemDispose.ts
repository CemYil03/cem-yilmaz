import { eq } from 'drizzle-orm';
import { items } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationItemDisposeArgs, GqlSItem, GqlSSession } from '../graphql/generated';
import { toGqlItem } from '../mappers/toGqlItem';

// Move the item into a disposal state (sold / gifted / lost / disposed) or
// back to `owned`. When entering a disposal state, `disposedAt` defaults to
// now if the caller didn't supply one. When returning to `owned` the stamp
// is cleared — a re-owned item shouldn't carry a stale disposal date.
export async function itemDispose(
    userId: string,
    args: GqlSAdminMutationItemDisposeArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSItem> {
    const now = new Date();
    const disposedAt = args.state === 'owned' ? null : (args.disposedAt ?? now);

    try {
        const [updated] = await serverRuntime.db
            .update(items)
            .set({
                disposalState: args.state,
                disposedAt,
                updatedAt: now,
            })
            .where(eq(items.itemId, args.itemId))
            .returning();
        if (!updated) throw new Error(`itemDispose: row ${args.itemId} not found`);
        await serverRuntime.publish.userUpdates({ userId });
        return toGqlItem(updated);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
