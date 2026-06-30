import { tool } from 'ai';
import { z } from 'zod';
import { projectLinkUpsert } from '../commands/projectLinkUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { ProjectsAgentMutationLog } from './agentPersonalAssistantProjects';

// Attach an external URL to a project ("the repo for Acme is github.com/me/
// acme"). Always creates / edits the link directly at project level; the
// activity-side variant (`activityId` set on create) lives only in the
// editor UI. Agents that want to log "sent offer, here's the PDF link"
// should call `projectActivityUpsert` first (to create the row) and then
// `projectLinkUpsert` with the activity id is *not* currently supported by
// this tool — we keep the shape narrow to avoid the agent forking the same
// resource into two surfaces by accident.

const projectLinkUpsertInputSchema = z.object({
    projectLinkId: z.string().uuid().optional().describe('Omit to create. Pass an existing id to edit.'),
    projectId: z.string().uuid().describe('Owning project.'),
    url: z.string().url().describe('Full URL including the scheme.'),
    label: z.string().max(200).optional().describe('Human label. Defaults to the URL host when omitted.'),
    kind: z
        .enum(['github', 'malt', 'figma', 'gdrive', 'notion', 'invoice', 'offer', 'other'])
        .describe('Resource category. Drives the card icon and grouping.'),
    pinned: z.boolean().optional().describe('Surface in the project header rail. Defaults to false.'),
});

interface ProjectsAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: ProjectsAgentMutationLog;
}

export function toolProjectLinkUpsert({ serverRuntime, session, mutations }: ProjectsAgentMutationContext) {
    return tool({
        description: [
            'Attach an external URL to a project, or edit an existing link.',
            'Use this when the user names a repo, mission, Figma file, drive folder, invoice link, etc. The link',
            'lives at project level; the detail page surfaces pinned links on the header rail and the full list',
            'on the Links tab.',
        ].join(' '),
        inputSchema: projectLinkUpsertInputSchema,
        execute: async (input) => {
            const result = await projectLinkUpsert(
                {
                    input: {
                        projectLinkId: input.projectLinkId ?? null,
                        projectId: input.projectId,
                        activityId: null,
                        url: input.url,
                        label: input.label ?? null,
                        kind: input.kind,
                        pinned: input.pinned ?? false,
                    },
                },
                session,
                serverRuntime,
            );
            mutations.push({
                kind: input.projectLinkId ? 'linkUpdate' : 'linkCreate',
                id: result.projectLinkId,
                title: result.label ?? result.url,
            });
            return result;
        },
    });
}
