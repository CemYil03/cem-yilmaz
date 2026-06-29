import { eq } from 'drizzle-orm';
import { projectActivities } from '../db/schema';
import type { ProjectActivityCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationProjectActivityUpsertArgs, GqlSProjectActivity, GqlSSession } from '../graphql/generated';
import { toGqlProjectActivity } from '../mappers/toGqlProjectActivity';

// Create or update a project activity row. Reserved for event-style
// entries (logged call, email, offer drafted, freeform note). Timed work
// sessions are owned by `projectTimerStart` / `projectTimerStop`, so
// passing `kind = 'work'` here is rejected — it would let a hand-crafted
// payload bypass the one-active-timer invariant. Pass an explicit
// `durationSec` for non-timer rows when the duration is known
// ("the call was 45 min"); leave it null otherwise.
export async function projectActivityUpsert(
    args: GqlSAdminMutationProjectActivityUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSProjectActivity> {
    const { input } = args;

    if (input.kind === 'work') {
        throw new Error('projectActivityUpsert: work-kind rows are owned by the timer mutations');
    }
    // The channel column is meaningful only for client-contact / meeting
    // entries; reject any other combination so the UI's "hide for non-
    // contact kinds" stays a sound invariant rather than a convention.
    if (input.channel && input.kind !== 'clientContact' && input.kind !== 'meeting') {
        throw new Error(`projectActivityUpsert: channel is only valid for clientContact / meeting (got kind='${input.kind}')`);
    }

    const now = new Date();
    const activityId = input.activityId ?? crypto.randomUUID();
    const payload: ProjectActivityCreate = {
        activityId,
        projectId: input.projectId,
        taskId: input.taskId ?? null,
        kind: input.kind,
        channel: input.channel ?? null,
        title: input.title,
        notes: input.notes ?? null,
        occurredAt: input.occurredAt,
        startedAt: null,
        endedAt: null,
        durationSec: input.durationSec ?? null,
        updatedAt: now,
    };

    try {
        if (input.activityId) {
            const [updated] = await serverRuntime.db
                .update(projectActivities)
                .set(payload)
                .where(eq(projectActivities.activityId, input.activityId))
                .returning();
            if (!updated) {
                throw new Error(`projectActivityUpsert: row ${input.activityId} not found`);
            }
            return toGqlProjectActivity(updated);
        }
        const [inserted] = await serverRuntime.db.insert(projectActivities).values(payload).returning();
        if (!inserted) {
            throw new Error('projectActivityUpsert: insert returned no rows');
        }
        return toGqlProjectActivity(inserted);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
