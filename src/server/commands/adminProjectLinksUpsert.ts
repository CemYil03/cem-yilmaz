import { tool } from 'ai';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { projectLinks } from '../db/schema';
import type { AdminProjectLinkCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminProjectLinkUpsertSchema } from '../graphql/generated';
import type { GqlSMutationResult, GqlSAdminProjectLinkUpsert, GqlSSession } from '../graphql/generated';

// Batch create-or-update of project links. Every input with a `projectLinkId`
// is updated; every input without one is inserted. `activityId` is honoured
// only on create (marks the link as "born from" that activity); on update it
// is ignored — the relationship is immutable once set, the FK
// cascade-set-null handles activity deletion, and the update path only
// rewrites url / label / kind / pinned.
//
// Pin toggles ride this same mutation: the caller passes the existing row
// (from the subscription payload) with `pinned` flipped. There is no separate
// toggle path. The whole batch runs inside a single transaction so a partial
// failure rolls back to zero writes. `referenceIds` echoes the id per input
// row (in input order).
export async function adminProjectLinksUpsert(
    userId: string,
    inputs: readonly GqlSAdminProjectLinkUpsert[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction.
    const rows = inputs.map((input) => {
        const projectLinkId = input.projectLinkId ?? crypto.randomUUID();
        const payload: AdminProjectLinkCreate = {
            projectLinkId,
            projectId: input.projectId,
            activityId: input.activityId ?? null,
            url: input.url,
            label: input.label ?? null,
            kind: input.kind,
            pinned: input.pinned ?? false,
            updatedAt: now,
        };
        return { projectLinkId, isUpdate: Boolean(input.projectLinkId), payload };
    });

    // Phase 2 — transactional execution.
    try {
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.projectLinkId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ projectLinkId: projectLinks.projectLinkId })
                    .from(projectLinks)
                    .where(inArray(projectLinks.projectLinkId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.projectLinkId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`adminProjectLinksUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    // `activityId` and `projectId` are immutable on update — omit them.
                    await transaction
                        .update(projectLinks)
                        .set({
                            url: row.payload.url,
                            label: row.payload.label,
                            kind: row.payload.kind,
                            pinned: row.payload.pinned,
                            updatedAt: now,
                        })
                        .where(eq(projectLinks.projectLinkId, row.projectLinkId));
                } else {
                    await transaction.insert(projectLinks).values(row.payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.projectLinkId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

// Each item is the generated `GqlSAdminProjectLinkUpsertSchema()` — same shape
// the GraphQL resolver validates, no hand-built duplicate. Gemini-safe: no
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

interface ProjectsAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolProjectLinksUpsert({ serverRuntime, session }: ProjectsAgentToolContext) {
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
            return adminProjectLinksUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
        },
    });
}
