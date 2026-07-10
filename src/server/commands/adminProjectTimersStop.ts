import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { projectActivities } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch stop of timers. For each id, stamp `endedAt = now` and write
// `durationSec` (computed in SQL against `startedAt` so client clock drift
// can't affect the recorded total). Idempotent per id — an already-stopped
// row is left untouched rather than re-stamped (re-stamping would silently
// drift the total). Throws if any id does not exist. `referenceIds` echoes
// the input `activityIds`.
export async function adminProjectTimersStop(
    userId: string,
    activityIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    try {
        await serverRuntime.db.transaction(async (transaction) => {
            const existing = await transaction
                .select({ activityId: projectActivities.activityId })
                .from(projectActivities)
                .where(inArray(projectActivities.activityId, activityIds as string[]));
            if (existing.length !== new Set(activityIds).size) {
                const found = new Set(existing.map((row) => row.activityId));
                const missing = activityIds.filter((id) => !found.has(id));
                throw new Error(`adminProjectTimersStop: rows not found: ${missing.join(', ')}`);
            }
            // Only close rows that are still open — an already-ended row is
            // skipped by the `isNull(endedAt)` predicate, preserving its
            // recorded total.
            for (const activityId of activityIds) {
                await transaction
                    .update(projectActivities)
                    .set({
                        endedAt: now,
                        durationSec: sql`GREATEST(0, EXTRACT(EPOCH FROM (${now.toISOString()}::timestamptz - ${projectActivities.startedAt}))::integer)`,
                        updatedAt: now,
                    })
                    .where(and(eq(projectActivities.activityId, activityId), isNull(projectActivities.endedAt)));
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...activityIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
