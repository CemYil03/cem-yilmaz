import { and, eq, isNull, sql } from 'drizzle-orm';
import { projectActivities } from '../db/schema';
import type { ProjectActivityCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationProjectTimerStartArgs, GqlSProjectActivity, GqlSSession } from '../graphql/generated';
import { toGqlProjectActivity } from '../mappers/toGqlProjectActivity';

// Starts a work timer on the given project. Runs as a single transaction:
//
// 1. Stop the currently-running timer (if any). `endedAt = now`,
//    `durationSec = endedAt - startedAt`. Skipped when no row is open.
// 2. Insert a new `kind = 'work'` row with `startedAt = occurredAt = now`,
//    `endedAt = null`, `durationSec = null`.
//
// Wrapping both in one transaction is what makes the partial unique
// index `ProjectActivities_singleActiveTimer_uniq` safe: a concurrent
// caller that tried to start a second timer would fail on insert and the
// whole transaction would roll back — never leaving two open rows.
export async function projectTimerStart(
    args: GqlSAdminMutationProjectTimerStartArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSProjectActivity> {
    const now = new Date();
    const title = args.title ?? 'Work session';

    try {
        const inserted = await serverRuntime.db.transaction(async (transaction) => {
            // Step 1 — stop any open timer in-place. `EXTRACT(EPOCH FROM ...)`
            // closes the row with the same `now` we are about to stamp on
            // the new one, so totals don't double-count the boundary
            // second.
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
            const payload: ProjectActivityCreate = {
                activityId: crypto.randomUUID(),
                projectId: args.projectId,
                taskId: args.taskId ?? null,
                kind: 'work',
                channel: null,
                title,
                notes: null,
                occurredAt: now,
                startedAt: now,
                endedAt: null,
                durationSec: null,
                updatedAt: now,
            };
            const [row] = await transaction.insert(projectActivities).values(payload).returning();
            if (!row) {
                throw new Error('projectTimerStart: insert returned no rows');
            }
            return row;
        });

        return toGqlProjectActivity(inserted);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
