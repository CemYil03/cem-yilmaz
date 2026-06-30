import { tool } from 'ai';
import { z } from 'zod';
import { taskDelete } from '../commands/taskDelete';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { ProjectsAgentMutationLog } from './agentPersonalAssistantProjects';

const taskDeleteInputSchema = z.object({
    taskId: z.uuid().describe('Task id from `projectsList` or `standaloneTasksList`.'),
    title: z.string().optional().describe('Task title as you understood it — recorded in the mutation log for the orchestrator narration.'),
});

interface ProjectsAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: ProjectsAgentMutationLog;
}

export function toolTaskDelete({ serverRuntime, session, mutations }: ProjectsAgentMutationContext) {
    return tool({
        description: [
            'Permanently delete a task. Use only when the user is unambiguously asking for a delete; for "done",',
            "prefer `taskUpsert` with `status: 'done'`.",
        ].join(' '),
        inputSchema: taskDeleteInputSchema,
        execute: async (input) => {
            const result = await taskDelete({ taskId: input.taskId }, session, serverRuntime);
            mutations.push({ kind: 'taskDelete', id: input.taskId, title: input.title });
            return result;
        },
    });
}
