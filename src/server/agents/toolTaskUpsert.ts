import { tool } from 'ai';
import { z } from 'zod';
import { taskUpsert } from '../commands/taskUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { ProjectsAgentMutationLog } from './agentPersonalAssistantProjects';

// Create-or-update a task. `projectId: null` produces a standalone todo
// surfaced on the Todos tab. `position` is required by the underlying
// command — pick a sensible tail-append value (e.g. number of existing
// tasks in the bucket) when creating; on update, echo the row's current
// position back unless the user is reordering.

const taskUpsertInputSchema = z.object({
    taskId: z.string().uuid().optional().describe('Omit to create. Pass an existing id to update.'),
    projectId: z
        .string()
        .uuid()
        .nullable()
        .optional()
        .describe('Parent project id. `null` creates a standalone todo on the Todos tab. Omit on update to leave unchanged.'),
    title: z.string().min(1).max(200).describe('Task title.'),
    notes: z.string().max(5000).optional().describe('Optional longer-form notes.'),
    status: z.enum(['todo', 'doing', 'done']).describe('Task status. Use `todo` for new captures.'),
    position: z.number().int().min(0).describe('Within-bucket ordering. For new rows pick the bucket size as the tail-append value.'),
    dueAt: z.string().datetime().optional().describe('Optional ISO-8601 due timestamp. Omit when the user has not specified one.'),
});

interface ProjectsAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: ProjectsAgentMutationLog;
}

export function toolTaskUpsert({ serverRuntime, session, mutations }: ProjectsAgentMutationContext) {
    return tool({
        description: [
            'Create or update a task. New rows default to status `todo`. Pass `projectId: null` for a standalone',
            'todo (Todos tab). To move a task to a different project, update it with the new `projectId`. The',
            'server does not auto-stamp `completedAt` on `status: done` — that is a separate edit when the user',
            'asks for it explicitly.',
        ].join(' '),
        inputSchema: taskUpsertInputSchema,
        execute: async (input) => {
            const result = await taskUpsert(
                {
                    input: {
                        taskId: input.taskId ?? null,
                        projectId: input.projectId ?? null,
                        title: input.title,
                        notes: input.notes ?? null,
                        status: input.status,
                        position: input.position,
                        dueAt: input.dueAt ? new Date(input.dueAt) : null,
                        completedAt: null,
                    },
                },
                session,
                serverRuntime,
            );
            mutations.push({
                kind: input.taskId ? 'taskUpdate' : 'taskCreate',
                id: result.taskId,
                title: result.title,
            });
            return result;
        },
    });
}
