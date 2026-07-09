import { tool } from 'ai';
import { projectLinkUpsert } from '../commands/projectLinkUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSProjectLinkUpsertSchema } from '../graphql/generated';
import type { GqlSProjectLinkUpsert, GqlSSession } from '../graphql/generated';
import type { ProjectsAgentMutationLog } from './agentPersonalAssistantProjects';
import { requireAdminUserId } from './requireAdminUserId';

// Attach an external URL to a project or edit an existing link. The input
// schema is the generated `GqlSProjectLinkUpsertSchema()` — same shape the
// GraphQL resolver validates, no hand-built duplicate. Gemini-safe: no
// `DateTime` fields, enum reused via the generated schema. See
// `docs/architecture/agent-delegation.md`.
//
// The `rawInput as GqlSProjectLinkUpsert` cast is the same workaround the
// travel tools use: the codegen output types the ZodObject as
// `ZodObject<Properties<T>>`, which `z.infer` cannot round-trip back to the
// concrete input type. The runtime schema DOES validate; the cast just
// recovers TS inference at the boundary.

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
            'Omit `projectLinkId` to create; pass an existing id to edit. `pinned` defaults to false, `label` defaults to the URL host.',
        ].join(' '),
        inputSchema: GqlSProjectLinkUpsertSchema(),
        execute: async (rawInput) => {
            const input = rawInput as GqlSProjectLinkUpsert;
            const result = await projectLinkUpsert(requireAdminUserId(session), { input }, session, serverRuntime);
            mutations.push({
                kind: input.projectLinkId ? 'linkUpdate' : 'linkCreate',
                id: result.projectLinkId,
                title: result.label ?? result.url,
            });
            return result;
        },
    });
}
