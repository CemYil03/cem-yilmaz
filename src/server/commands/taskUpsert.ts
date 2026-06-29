import { eq } from 'drizzle-orm';
import { tasks } from '../db/schema';
import type { TaskCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationTaskUpsertArgs, GqlSSession, GqlSTask } from '../graphql/generated';
import { toGqlTask } from '../mappers/toGqlTask';

// Two-phase upsert: Phase 1 builds the payload, Phase 2 runs the single DB
// call. `projectId` is honored verbatim — passing `null` creates (or
// re-targets) the row as a standalone todo. Status transitions to `done`
// don't auto-stamp `completedAt` on the server; the client passes the
// timestamp it picked when the user ticked the checkbox so the audit log
// reflects user intent rather than insert latency.
export async function taskUpsert(
    args: GqlSAdminMutationTaskUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSTask> {
    const { input } = args;

    // Phase 1 — payload construction.
    const taskId = input.taskId ?? crypto.randomUUID();
    const now = new Date();
    const payload: TaskCreate = {
        taskId,
        projectId: input.projectId ?? null,
        title: input.title,
        notes: input.notes ?? null,
        status: input.status,
        position: input.position,
        dueAt: input.dueAt ?? null,
        completedAt: input.completedAt ?? null,
        updatedAt: now,
    };

    // Phase 2 — single-statement DB call (no transaction needed).
    try {
        if (input.taskId) {
            const [updated] = await serverRuntime.db.update(tasks).set(payload).where(eq(tasks.taskId, input.taskId)).returning();
            if (!updated) {
                throw new Error(`taskUpsert: row ${input.taskId} not found`);
            }
            return toGqlTask(updated);
        }
        const [inserted] = await serverRuntime.db.insert(tasks).values(payload).returning();
        if (!inserted) {
            throw new Error('taskUpsert: insert returned no rows');
        }
        return toGqlTask(inserted);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
