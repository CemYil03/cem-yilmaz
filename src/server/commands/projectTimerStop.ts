import { eq, sql } from 'drizzle-orm';
import { projectActivities } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationProjectTimerStopArgs, GqlSProjectActivity, GqlSSession } from '../graphql/generated';
import { toGqlProjectActivity } from '../mappers/toGqlProjectActivity';

// Stops the given timer. Idempotent on an already-stopped row — returns
// the existing values rather than re-stamping. The duration is computed
// in SQL against `startedAt` so client clock drift can't affect the
// recorded total.
export async function projectTimerStop(
    userId: string,
    args: GqlSAdminMutationProjectTimerStopArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSProjectActivity> {
    const now = new Date();

    try {
        // Read first to detect the idempotent case — re-stopping an
        // already-stopped row is not an error, but we should not rewrite
        // `endedAt` or `durationSec` (would silently drift the total).
        const [existing] = await serverRuntime.db.select().from(projectActivities).where(eq(projectActivities.activityId, args.activityId));
        if (!existing) {
            throw new Error(`projectTimerStop: row ${args.activityId} not found`);
        }
        if (existing.endedAt) {
            return toGqlProjectActivity(existing);
        }

        const [updated] = await serverRuntime.db
            .update(projectActivities)
            .set({
                endedAt: now,
                durationSec: sql`GREATEST(0, EXTRACT(EPOCH FROM (${now.toISOString()}::timestamptz - ${projectActivities.startedAt}))::integer)`,
                updatedAt: now,
            })
            .where(eq(projectActivities.activityId, args.activityId))
            .returning();
        if (!updated) {
            throw new Error(`projectTimerStop: row ${args.activityId} vanished mid-update`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return toGqlProjectActivity(updated);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
