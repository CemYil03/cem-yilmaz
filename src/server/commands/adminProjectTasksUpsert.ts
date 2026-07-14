import { tool } from 'ai';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { tasks } from '../db/schema';
import type { AdminProjectTaskCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminProjectTaskStatusSchema } from '../graphql/generated';
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

// Hand-built item schema (not derived from `GqlSAdminProjectTaskCreateSchema()`) for the
// same reason as `toolProjectsUpsert`: the generated schema declares
// `dueAt` / `completedAt` as `z.date()`, which the AI SDK cannot render
// cleanly into JSON Schema for Gemini's `structuredOutputs` constrained
// decoding. The wire shape is always JSON, so timestamp fields declare
// `z.string()` here and `execute` converts with `new Date(...)`. Only the
// enum schema is reused so a future status addition surfaces as a TS error
// rather than a runtime mismatch.

const taskItemSchema = z.object({
    taskId: z.uuid().nullish().describe('Omit (or null) to create. Pass an existing id to update.'),
    projectId: z
        .uuid()
        .nullish()
        .describe(
            'Parent project id. `null` (or omit) creates a standalone todo on the Todos tab. Pass the existing id to leave the row where it is, or a new id to move it.',
        ),
    title: z.string().min(1).max(200).describe('AdminProjectTask title.'),
    notes: z.string().max(5000).nullish().describe('Optional longer-form notes.'),
    status: GqlSAdminProjectTaskStatusSchema.describe(
        'AdminProjectTask status: `backlog` (not yet committed), `todo` (open), `doing` (in progress), `blocked` (waiting on something external), `done`. Use `todo` for new captures unless the user says otherwise.',
    ),
    position: z.number().int().min(0).describe('Within-bucket ordering. For new rows pick the bucket size as the tail-append value.'),
    dueAt: z.string().nullish().describe('Optional ISO-8601 due timestamp. Omit when the user has not specified one.'),
    completedAt: z
        .string()
        .nullish()
        .describe(
            'Optional ISO-8601 completion timestamp. The server does not auto-stamp this on `status: done` — pass it only when the user explicitly names a completion time, otherwise omit.',
        ),
});

const toolTasksUpsertInputSchema = z.object({
    tasks: z.array(taskItemSchema).min(1).describe('One or more tasks to create or update. Pass a one-element array for a single edit.'),
});

interface ProjectsAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolTasksUpsert({ serverRuntime, session }: ProjectsAgentToolContext) {
    return tool({
        description: [
            'Batch create or update tasks. New rows default to status `todo`. Pass `projectId: null` for a',
            'standalone todo (Todos tab). To move a task to a different project, update it with the new `projectId`.',
            'The server does not auto-stamp `completedAt` on `status: done`. Batch same-shape writes into one call;',
            'every row with a `taskId` is updated, every row without one is inserted. Returns `referenceIds` in',
            'input order.',
        ].join(' '),
        inputSchema: toolTasksUpsertInputSchema,
        execute: async (input) => {
            const inputs: GqlSAdminProjectTaskCreate[] = input.tasks.map((task) => ({
                taskId: task.taskId ?? null,
                projectId: task.projectId ?? null,
                title: task.title,
                notes: task.notes ?? null,
                status: task.status,
                position: task.position,
                dueAt: task.dueAt ? new Date(task.dueAt) : null,
                completedAt: task.completedAt ? new Date(task.completedAt) : null,
                effort: null,
                whenBucket: null,
            }));
            return adminProjectTasksUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
        },
    });
}
