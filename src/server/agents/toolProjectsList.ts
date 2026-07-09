import { tool } from 'ai';
import { z } from 'zod';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { adminProjectFindMany } from '../queries/adminProjectFindMany';

// Read tool for `agentPersonalAssistantProjects`. Thin wrapper around the
// `adminProjectFindMany` query — same data the `/workspace/projects` board renders.
// The system prompt already embeds a compact snapshot (see
// `projectsSnapshotForAgent.ts`), so the sub-agent only needs this when it
// wants the full task list for a specific project. See
// `docs/architecture/agent-delegation.md`.

const projectsListInputSchema = z.object({
    status: z
        .enum(['idea', 'planning', 'active', 'paused', 'done', 'archived'])
        .optional()
        .describe('Narrow to a single board column. Omit to list every column at once.'),
});

interface ProjectsAgentReadContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolProjectsList({ serverRuntime, session }: ProjectsAgentReadContext) {
    return tool({
        description: [
            'List projects on the workspace board with their tasks eagerly joined.',
            "Use this when the snapshot in the system prompt isn't enough — typically when you need a specific",
            "project's full task list (titles, statuses, due dates) before updating tasks. For 'what projects do",
            "I have?' the snapshot already answers; skip the tool call.",
        ].join(' '),
        inputSchema: projectsListInputSchema,
        execute: async (input) => {
            const result = await adminProjectFindMany(input.status ?? null, session, serverRuntime);
            return result;
        },
    });
}
