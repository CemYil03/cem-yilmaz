import { eq, inArray } from 'drizzle-orm';
import { tasks } from '../db/schema';
import type { AdminProjectTaskCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession, GqlSAdminProjectTaskCreate } from '../graphql/generated';

// Batch upsert of tasks. Every input with a `taskId` is updated; every input
// without one is inserted under a freshly-minted UUID. `projectId` is honored
// verbatim — passing `null` creates (or re-targets) the row as a standalone
// todo. Status transitions to `done` don't auto-stamp `completedAt`; the
// client passes the timestamp it picked so the audit log reflects user intent
// rather than insert latency. The whole batch runs inside a single
// transaction so a partial failure rolls back to zero writes. `referenceIds`
// echoes the id per input row (in input order).
export async function adminProjectTasksUpsert(
    userId: string,
    inputs: readonly GqlSAdminProjectTaskCreate[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction.
    const rows = inputs.map((input) => {
        const taskId = input.taskId ?? crypto.randomUUID();
        const payload: AdminProjectTaskCreate = {
            taskId,
            projectId: input.projectId ?? null,
            title: input.title,
            notes: input.notes ?? null,
            status: input.status,
            position: input.position,
            dueAt: input.dueAt ?? null,
            completedAt: input.completedAt ?? null,
            effort: input.effort ?? null,
            whenBucket: input.whenBucket ?? null,
            updatedAt: now,
        };
        return { taskId, isUpdate: Boolean(input.taskId), payload };
    });

    // Phase 2 — transactional execution.
    try {
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.taskId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction.select({ taskId: tasks.taskId }).from(tasks).where(inArray(tasks.taskId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.taskId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`adminProjectTasksUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction.update(tasks).set(row.payload).where(eq(tasks.taskId, row.taskId));
                } else {
                    await transaction.insert(tasks).values(row.payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.taskId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
