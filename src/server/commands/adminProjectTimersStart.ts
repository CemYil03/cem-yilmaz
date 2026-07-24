import { and, eq, isNull, sql } from 'drizzle-orm';
import { projectActivities } from '../db/schema';
import type { AdminProjectActivityCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminProjectTimerStartInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch start of work timers. Runs as a single transaction; each input is
// processed sequentially, and for each one:
//
// 1. Stop the currently-running timer (if any). `endedAt = now`,
//    `durationSec = endedAt - startedAt`. Skipped when no row is open.
// 2. Insert a new `kind = 'work'` row with `startedAt = occurredAt = now`,
//    `endedAt = null`, `durationSec = null`.
//
// Because each iteration stops all open timers before its own insert, a
// multi-element batch ends with only the last row open — the partial unique
// index `ProjectActivities_singleActiveTimer_uniq` stays satisfied
// throughout, and a concurrent second-timer start rolls the whole
// transaction back. In practice the UI passes a one-element array; the batch
// shape exists for API consistency. `referenceIds` carries the new
// `activityId` per input in input order.
//
// Kept separate from `adminProjectActivitiesUpsert` because the server-side clock
// semantics (stop-open-timer + `startedAt: now`) are distinct from a plain
// field-set upsert.
export async function adminProjectTimersStart(
    userId: string,
    inputs: readonly GqlSAdminProjectTimerStartInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    try {
        const activityIds = await serverRuntime.db.transaction(async (transaction) => {
            const ids: string[] = [];
            for (const input of inputs) {
                // Step 1 — stop any open timer in-place. `EXTRACT(EPOCH FROM
                // ...)` closes the row with the same `now` we stamp on the new
                // one, so totals don't double-count the boundary second.
                await transaction
                    .update(projectActivities)
                    .set({
                        endedAt: now,
                        durationSec: sql`GREATEST(0, EXTRACT(EPOCH FROM (${now.toISOString()}::timestamptz - ${projectActivities.startedAt}))::integer)`,
                        updatedAt: now,
                    })
                    .where(and(eq(projectActivities.kind, 'work'), isNull(projectActivities.endedAt)));

                // Step 2 — insert the new running row. `occurredAt` mirrors
                // `startedAt` so the timeline orders work sessions alongside
                // events without a special case.
                const activityId = crypto.randomUUID();
                const payload: AdminProjectActivityCreate = {
                    activityId,
                    projectId: input.projectId,
                    taskId: input.taskId ?? null,
                    kind: 'work',
                    channel: null,
                    direction: 'internal',
                    title: input.title ?? 'Work session',
                    notes: null,
                    occurredAt: now,
                    startedAt: now,
                    endedAt: null,
                    durationSec: null,
                    updatedAt: now,
                };
                await transaction.insert(projectActivities).values(payload);
                ids.push(activityId);
            }
            return ids;
        });

        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: activityIds };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
