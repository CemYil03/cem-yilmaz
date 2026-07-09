import { eq, inArray } from 'drizzle-orm';
import { projectLinks } from '../db/schema';
import type { ProjectLinkCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSProjectLinkUpsert, GqlSSession } from '../graphql/generated';

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
export async function projectLinksUpsert(
    userId: string,
    inputs: readonly GqlSProjectLinkUpsert[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction.
    const rows = inputs.map((input) => {
        const projectLinkId = input.projectLinkId ?? crypto.randomUUID();
        const payload: ProjectLinkCreate = {
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
                    throw new Error(`projectLinksUpsert: rows not found: ${missing.join(', ')}`);
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
