import { tool } from 'ai';
import { z } from 'zod';
import { tasksDelete } from '../commands/tasksDelete';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { ProjectsAgentMutationLog } from './agentPersonalAssistantProjects';
import { requireAdminUserId } from './requireAdminUserId';

const toolTasksDeleteInputSchema = z.object({
    taskIds: z.array(z.uuid()).min(1).describe('Task ids from `projectsList` or `standaloneTasksList`.'),
});

interface ProjectsAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: ProjectsAgentMutationLog;
}

export function toolTasksDelete({ serverRuntime, session, mutations }: ProjectsAgentMutationContext) {
    return tool({
        description: [
            'Permanently delete one or more tasks. Use only when the user is unambiguously asking for a delete; for',
            '"done", prefer `tasksUpsert` with `status: \'done\'`.',
        ].join(' '),
        inputSchema: toolTasksDeleteInputSchema,
        execute: async (input) => {
            const result = await tasksDelete(requireAdminUserId(session), input.taskIds, session, serverRuntime);
            for (const taskId of input.taskIds) mutations.push({ kind: 'taskDelete', id: taskId });
            return result;
        },
    });
}
