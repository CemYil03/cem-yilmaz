import { tool } from 'ai';
import { z } from 'zod';
import { adminProjectLinksUpsert } from '../commands/adminProjectLinksUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminProjectLinkUpsertSchema } from '../graphql/generated';
import type { GqlSAdminProjectLinkUpsert, GqlSSession } from '../graphql/generated';
import type { ProjectsAgentMutationLog } from './agentPersonalAssistantProjects';
import { requireAdminUserId } from './requireAdminUserId';

// Batch attach of external URLs to projects or edit of existing links. Each
// item is the generated `GqlSAdminProjectLinkUpsertSchema()` — same shape the
// GraphQL resolver validates, no hand-built duplicate. Gemini-safe: no
// `DateTime` fields, enum reused via the generated schema. See
// `docs/architecture/agent-delegation.md`.
//
// The `rawInput.projectLinks as GqlSAdminProjectLinkUpsert[]` cast is the same
// workaround the travel tools use: the codegen output types the ZodObject as
// `ZodObject<Properties<T>>`, which `z.infer` cannot round-trip back to the
// concrete input type. The runtime schema DOES validate; the cast just
// recovers TS inference at the boundary.

const toolProjectLinksUpsertInputSchema = z.object({
    projectLinks: z
        .array(GqlSAdminProjectLinkUpsertSchema())
        .min(1)
        .describe('One or more links to create or edit. Pass a one-element array for a single link.'),
});

interface ProjectsAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: ProjectsAgentMutationLog;
}

export function toolProjectLinksUpsert({ serverRuntime, session, mutations }: ProjectsAgentMutationContext) {
    return tool({
        description: [
            'Batch attach external URLs to a project, or edit existing links.',
            'Use this when the user names a repo, mission, Figma file, drive folder, invoice link, etc. The link',
            'lives at project level by default; the detail page surfaces pinned links on the header rail and the full list',
            'on the Links tab. Pass `activityId` only when the link is conceptually tied to a specific activity row.',
            'Omit `projectLinkId` to create; pass an existing id to edit. `pinned` defaults to false, `label` defaults to the URL host.',
            'Batch same-shape writes into one call. Returns `referenceIds` in input order.',
        ].join(' '),
        inputSchema: toolProjectLinksUpsertInputSchema,
        execute: async (rawInput) => {
            const inputs = rawInput.projectLinks as GqlSAdminProjectLinkUpsert[];
            const result = await adminProjectLinksUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
            const referenceIds = result.referenceIds ?? [];
            inputs.forEach((link, index) => {
                mutations.push({
                    kind: link.projectLinkId ? 'linkUpdate' : 'linkCreate',
                    id: referenceIds[index] ?? link.projectLinkId ?? '',
                    title: link.label ?? link.url,
                });
            });
            return result;
        },
    });
}
