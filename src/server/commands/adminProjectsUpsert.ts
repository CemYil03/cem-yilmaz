import { desc, eq, inArray } from 'drizzle-orm';
import { projectRequests, projects } from '../db/schema';
import type { AdminProjectCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSAdminProjectCreate, GqlSSession } from '../graphql/generated';

// Batch create-or-update of projects. Every input with a `projectId` is
// updated; every input without one is inserted under a freshly-minted UUID.
// Two behaviours are folded together per input row:
//
// 1. Plain edits — `projectId` set → update; absent → insert. Cross-status
//    moves work by passing the new status; `position` is set to whatever
//    the editor chose for the target column.
// 2. Conversion from a `AdminProjectRequest` — on a create with `sourceRequestId`
//    set, validate the request is `emailVerified` and archive it in the same
//    transaction that inserts the project.
//
// On a create, `position` is optional — when absent, the row lands at the
// tail of the `planning` column. The tail is read once before the loop and
// incremented locally across new rows so a same-status batch lays out
// contiguously without a per-row max query. On an update, `position` is
// required and passed through. The whole batch runs inside a single
// transaction so a partial failure rolls back to zero writes.
// `referenceIds` echoes the id per input row (in input order).
export async function adminProjectsUpsert(
    userId: string,
    inputs: readonly GqlSAdminProjectCreate[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — assign ids up front so the returned `referenceIds` echoes
    // input order (position defaults + source-request checks resolve in the
    // transaction).
    const seeds = inputs.map((input) => {
        const isUpdate = Boolean(input.projectId);
        if (isUpdate && (input.position === null || input.position === undefined)) {
            throw new Error('adminProjectsUpsert: position is required when updating an existing project');
        }
        return {
            projectId: input.projectId ?? crypto.randomUUID(),
            input,
            isUpdate,
        };
    });

    // Phase 2 — transactional execution.
    try {
        const updateIds = seeds.filter((seed) => seed.isUpdate).map((seed) => seed.projectId);

        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ projectId: projects.projectId })
                    .from(projects)
                    .where(inArray(projects.projectId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.projectId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`adminProjectsUpsert: rows not found: ${missing.join(', ')}`);
                }
            }

            // Read the planning tail once — new rows without an explicit
            // position append to it, incrementing locally so a batch of
            // creates lays out contiguously.
            let planningTail: number | null = null;
            const planningTailNext = async (): Promise<number> => {
                if (planningTail === null) {
                    const [tail] = await transaction
                        .select({ position: projects.position })
                        .from(projects)
                        .where(eq(projects.status, 'planning'))
                        .orderBy(desc(projects.position))
                        .limit(1);
                    planningTail = tail?.position ?? -1;
                }
                planningTail += 1;
                return planningTail;
            };

            for (const { projectId, input, isUpdate } of seeds) {
                let sourceRequest = null;
                if (!isUpdate && input.sourceRequestId) {
                    const [row] = await transaction
                        .select()
                        .from(projectRequests)
                        .where(eq(projectRequests.projectRequestId, input.sourceRequestId));
                    if (!row) {
                        throw new Error(`adminProjectsUpsert: source request ${input.sourceRequestId} not found`);
                    }
                    if (row.status !== 'emailVerified') {
                        throw new Error(
                            `adminProjectsUpsert: source request ${input.sourceRequestId} is in state '${row.status}', expected 'emailVerified'`,
                        );
                    }
                    sourceRequest = row;
                }

                let position = input.position ?? null;
                if (!isUpdate && position === null) {
                    position = await planningTailNext();
                }

                const payload: AdminProjectCreate = {
                    projectId,
                    title: input.title,
                    description: input.description ?? null,
                    notes: input.notes ?? null,
                    status: input.status,
                    position: position ?? 0,
                    sourceRequestId: input.sourceRequestId ?? null,
                    startedAt: input.startedAt ?? null,
                    completedAt: input.completedAt ?? null,
                    updatedAt: now,
                };

                if (isUpdate) {
                    await transaction.update(projects).set(payload).where(eq(projects.projectId, projectId));
                } else {
                    await transaction.insert(projects).values(payload);
                }

                if (sourceRequest) {
                    await transaction
                        .update(projectRequests)
                        .set({ status: 'archived', updatedAt: now })
                        .where(eq(projectRequests.projectRequestId, sourceRequest.projectRequestId));
                }
            }
        });

        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: seeds.map((seed) => seed.projectId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
