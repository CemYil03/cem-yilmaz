import { tool } from 'ai';
import { z } from 'zod';
import { adminProjectTasksUpsert } from '../commands/adminProjectTasksUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminProjectTaskStatusSchema } from '../graphql/generated';
import type { GqlSSession, GqlSAdminProjectTaskCreate } from '../graphql/generated';
import type { ProjectsAgentMutationLog } from './agentPersonalAssistantProjects';
import { requireAdminUserId } from './requireAdminUserId';

// Batch create-or-update of tasks. `projectId: null` produces a standalone
// todo surfaced on the Todos tab. `position` is required by the underlying
// command — pick a sensible tail-append value (e.g. number of existing tasks
// in the bucket) when creating; on update, echo the row's current position
// back unless the user is reordering.
//
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
    status: GqlSAdminProjectTaskStatusSchema.describe('AdminProjectTask status. Use `todo` for new captures.'),
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

interface ProjectsAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: ProjectsAgentMutationLog;
}

export function toolTasksUpsert({ serverRuntime, session, mutations }: ProjectsAgentMutationContext) {
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
            const result = await adminProjectTasksUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
            const referenceIds = result.referenceIds ?? [];
            input.tasks.forEach((task, index) => {
                mutations.push({
                    kind: task.taskId ? 'taskUpdate' : 'taskCreate',
                    id: referenceIds[index] ?? task.taskId ?? '',
                    title: task.title,
                });
            });
            return result;
        },
    });
}
