import { tool } from 'ai';
import { z } from 'zod';
import { adminProjectsDelete } from '../commands/adminProjectsDelete';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { ProjectsAgentMutationLog } from './agentPersonalAssistantProjects';
import { requireAdminUserId } from './requireAdminUserId';

// Batch delete of workspace projects. The `Tasks.projectId` FK is
// ON DELETE CASCADE so every project-bound task disappears with it — surface
// that in the summary back to the user when the sub-agent uses this tool.

const toolProjectsDeleteInputSchema = z.object({
    projectIds: z.array(z.uuid()).min(1).describe('AdminProject ids from the system-prompt snapshot or a prior list call.'),
});

interface ProjectsAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: ProjectsAgentMutationLog;
}

export function toolProjectsDelete({ serverRuntime, session, mutations }: ProjectsAgentMutationContext) {
    return tool({
        description: [
            'Permanently delete one or more projects. Every task under each project is cascaded away in the same',
            'transaction. Standalone todos (no parent project) are unaffected. Use this only when the user is',
            'unambiguously asking for a delete; for soft-archive, prefer `projectsUpsert` with `status: "archived"`.',
        ].join(' '),
        inputSchema: toolProjectsDeleteInputSchema,
        execute: async (input) => {
            const result = await adminProjectsDelete(requireAdminUserId(session), input.projectIds, session, serverRuntime);
            for (const projectId of input.projectIds) mutations.push({ kind: 'projectDelete', id: projectId });
            return result;
        },
    });
}
