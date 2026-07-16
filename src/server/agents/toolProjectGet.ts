import { tool } from 'ai';
import { z } from 'zod';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { adminProjectFindOne } from '../queries/adminProjectFindOne';

// Read tool for `agentPersonalAssistantProjects`. Wraps the single-project
// `adminProjectFindOne` query — the same data the `/workspace/projects/$id`
// detail route renders: the project plus its tasks, activity timeline, links,
// and file metadata. The system-prompt snapshot only carries projects + task
// counts (see `projectsSnapshotForAgent.ts`), so this is how the sub-agent
// inspects one project's history (activities) or its attachment list without
// pulling the whole board through `projectsList`. See
// `docs/architecture/agent-delegation.md`.

const projectGetInputSchema = z.object({
    projectId: z.uuid().describe('The project to load. Ids come from the board snapshot or a prior tool result.'),
});

interface ProjectsAgentReadContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolProjectGet({ serverRuntime, session }: ProjectsAgentReadContext) {
    return tool({
        description: [
            'Load one project by id with its full detail: tasks, the activity timeline (meetings, calls, offers,',
            'notes, work sessions — newest first), links, and attached files (metadata only — use',
            "`projectFileContentGet` to read a file's body). Use this when the user asks about a specific project's",
            'history, activities, or what is attached to it — the board snapshot only has task counts, and this is',
            'cheaper than `projectsList` (which pulls every project). Never guess the id.',
        ].join(' '),
        inputSchema: projectGetInputSchema,
        execute: async (input) => {
            return adminProjectFindOne(input.projectId, session, serverRuntime);
        },
    });
}
