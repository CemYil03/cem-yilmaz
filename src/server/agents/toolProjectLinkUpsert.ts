import { tool } from 'ai';
import { z } from 'zod';
import { projectLinkUpsert } from '../commands/projectLinkUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSProjectLinkKindSchema } from '../graphql/generated';
import type { GqlSSession } from '../graphql/generated';
import type { ProjectsAgentMutationLog } from './agentPersonalAssistantProjects';
import { requireAdminUserId } from './requireAdminUserId';

// Attach an external URL to a project ("the repo for Acme is github.com/me/
// acme") or edit an existing link. Hand-built schema for the same reason
// the other mutation tools in this directory are hand-built (see
// `toolProjectUpsert.ts`): even though this command's generated input has
// no `z.date()` fields today, keeping every tool on the same shape — an
// explicit `z.object` that reuses only the GraphQL enum schemas — avoids
// the divergence where one tool surprises the LLM with a different
// JSON-Schema rendering, and matches the convention documented in
// `docs/architecture/agent-delegation.md`.

const projectLinkUpsertInputSchema = z.object({
    projectLinkId: z.uuid().nullish().describe('Omit (or null) to create. Pass an existing id to edit.'),
    projectId: z.uuid().describe('Owning project.'),
    activityId: z
        .uuid()
        .nullish()
        .describe(
            'Optional: bind the link to a specific activity row (e.g. "the PDF I just attached to this offer entry"). Leave null to attach at project level — that is the normal case for the agent.',
        ),
    url: z.url().describe('Full URL including the scheme.'),
    label: z.string().max(200).nullish().describe('Human label. Defaults to the URL host when omitted.'),
    kind: GqlSProjectLinkKindSchema.describe('Resource category. Drives the card icon and grouping.'),
    pinned: z.boolean().nullish().describe('Surface in the project header rail. Defaults to false.'),
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
            'lives at project level by default; the detail page surfaces pinned links on the header rail and the full list',
            'on the Links tab. Pass `activityId` only when the link is conceptually tied to a specific activity row.',
        ].join(' '),
        inputSchema: projectLinkUpsertInputSchema,
        execute: async (input) => {
            const result = await projectLinkUpsert(
                requireAdminUserId(session),
                {
                    input: {
                        projectLinkId: input.projectLinkId ?? null,
                        projectId: input.projectId,
                        activityId: input.activityId ?? null,
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
