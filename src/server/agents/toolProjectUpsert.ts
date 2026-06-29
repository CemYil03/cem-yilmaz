import { tool } from 'ai';
import { z } from 'zod';
import { projectUpsert } from '../commands/projectUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { ProjectsAgentMutationLog } from './agentPersonalAssistantProjects';

// Create-or-update a workspace project. Thin wrapper around
// `commands/projectUpsert` — every constraint (position defaulting, source
// request validation on convert) lives in the command, not here. On success
// pushes one entry onto the shared mutation log so `toolDelegateToProjects`
// can surface it back to the orchestrator.

const projectUpsertInputSchema = z.object({
    projectId: z
        .string()
        .uuid()
        .optional()
        .describe('Omit to create a new project. Pass an existing id to update; ids come from the prompt snapshot or projectsList.'),
    title: z.string().min(1).max(200).describe('Single-line project title.'),
    description: z.string().max(2000).optional().describe('Short summary shown on the card. Optional.'),
    notes: z.string().max(10000).optional().describe('Long-form notes / markdown context. Optional.'),
    status: z
        .enum(['idea', 'planning', 'active', 'paused', 'done', 'archived'])
        .describe('Board column. New projects typically land in `planning` or `idea`.'),
    position: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Within-status ordering. Required when updating; on create the server appends to the planning column if omitted.'),
});

interface ProjectsAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: ProjectsAgentMutationLog;
}

export function toolProjectUpsert({ serverRuntime, session, mutations }: ProjectsAgentMutationContext) {
    return tool({
        description: [
            'Create or update a workspace project.',
            'For a new project: omit `projectId` — the server allocates one. For an edit: pass the id from the',
            'system-prompt snapshot or a prior `projectsList` call. `position` is required on edit and ignored on',
            'create (the server appends to the planning column). Status `done` does not auto-stamp `completedAt`;',
            'leave that to the user via a follow-up edit.',
        ].join(' '),
        inputSchema: projectUpsertInputSchema,
        execute: async (input) => {
            const result = await projectUpsert(
                {
                    input: {
                        projectId: input.projectId ?? null,
                        title: input.title,
                        description: input.description ?? null,
                        notes: input.notes ?? null,
                        status: input.status,
                        position: input.position ?? null,
                        sourceRequestId: null,
                        startedAt: null,
                        completedAt: null,
                    },
                },
                session,
                serverRuntime,
            );
            mutations.push({
                kind: input.projectId ? 'projectUpdate' : 'projectCreate',
                id: result.projectId,
                title: result.title,
            });
            return result;
        },
    });
}
