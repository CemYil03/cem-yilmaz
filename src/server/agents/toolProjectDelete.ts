import { tool } from 'ai';
import { z } from 'zod';
import { projectDelete } from '../commands/projectDelete';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { ProjectsAgentMutationLog } from './agentPersonalAssistantProjects';

// Delete a workspace project. The `Tasks.projectId` FK is ON DELETE CASCADE
// so every project-bound task disappears with it — surface that in the
// summary back to the user when the sub-agent uses this tool.

const projectDeleteInputSchema = z.object({
    projectId: z.string().uuid().describe('Project id from the system-prompt snapshot or a prior list call.'),
    title: z
        .string()
        .optional()
        .describe('The project title as you understood it — recorded in the mutation log so the orchestrator can narrate the delete.'),
});

interface ProjectsAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: ProjectsAgentMutationLog;
}

export function toolProjectDelete({ serverRuntime, session, mutations }: ProjectsAgentMutationContext) {
    return tool({
        description: [
            'Permanently delete a project. Every task under the project is cascaded away in the same transaction.',
            'Standalone todos (no parent project) are unaffected. Use this only when the user is unambiguously',
            'asking for a delete; for soft-archive, prefer `projectUpsert` with `status: "archived"`.',
        ].join(' '),
        inputSchema: projectDeleteInputSchema,
        execute: async (input) => {
            const result = await projectDelete({ projectId: input.projectId }, session, serverRuntime);
            mutations.push({ kind: 'projectDelete', id: input.projectId, title: input.title });
            return result;
        },
    });
}
