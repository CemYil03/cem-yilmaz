import { tool } from 'ai';
import { z } from 'zod';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { standaloneTasksList } from '../queries/standaloneTasksList';

// Read tool for `agentPersonalAssistantProjects`. Lists tasks with
// `projectId IS NULL` — the Todos tab on `/workspace/projects`. Standalone
// counts are in the snapshot but the full list is not, so the sub-agent
// calls this when it needs ids or notes.

interface ProjectsAgentReadContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolStandaloneTasksList({ serverRuntime, session }: ProjectsAgentReadContext) {
    return tool({
        description: [
            'List standalone todos (tasks with no parent project).',
            'Use this when the user references a todo that is not under any project, or when you need a',
            'standalone task id to update or delete.',
        ].join(' '),
        inputSchema: z.object({}),
        execute: async () => {
            const result = await standaloneTasksList(session, serverRuntime);
            return result;
        },
    });
}
