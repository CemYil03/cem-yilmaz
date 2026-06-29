import { asc, eq } from 'drizzle-orm';
import { projectRequests, projects } from '../db/schema';
import type { ProjectCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationProjectUpsertArgs, GqlSProject, GqlSSession } from '../graphql/generated';
import { toGqlProject } from '../mappers/toGqlProject';

// Single create-or-update entry point for the projects board. Two
// behaviours are folded together:
//
// 1. Plain edits — `projectId` set → update the row; `projectId` absent
//    → insert a new row. Cross-status moves work by passing the new
//    status here; `position` is set to whatever the editor chose for the
//    target column.
// 2. Conversion from a `ProjectRequest` — on a create with
//    `sourceRequestId` set, validate the request is `emailVerified` and
//    archive it in the same transaction that inserts the project. The
//    visitor's brief is already in `description` / `notes` because the
//    inbox client prefills the form from the request before submit, so
//    no synthesis happens server-side.
//
// On a create, `position` is optional — when absent, the row lands at
// the end of the `planning` column (max(position) + 1). On an update,
// `position` is required and passed through.
export async function projectUpsert(
    args: GqlSAdminMutationProjectUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSProject> {
    const { input } = args;
    const isCreate = !input.projectId;
    const now = new Date();

    if (!isCreate && (input.position === null || input.position === undefined)) {
        throw new Error('projectUpsert: position is required when updating an existing project');
    }

    try {
        const result = await serverRuntime.db.transaction(async (transaction) => {
            // Conversion-from-request preflight — read inside the
            // transaction so a concurrent archive can't slip past us.
            let sourceRequest = null;
            if (isCreate && input.sourceRequestId) {
                const [row] = await transaction
                    .select()
                    .from(projectRequests)
                    .where(eq(projectRequests.projectRequestId, input.sourceRequestId));
                if (!row) {
                    throw new Error(`projectUpsert: source request ${input.sourceRequestId} not found`);
                }
                if (row.status !== 'emailVerified') {
                    throw new Error(
                        `projectUpsert: source request ${input.sourceRequestId} is in state '${row.status}', expected 'emailVerified'`,
                    );
                }
                sourceRequest = row;
            }

            // Default position on create to the tail of the `planning`
            // column. Keeps hand-created rows out of the editor's hair
            // and gives request-conversions a natural landing spot.
            let position = input.position ?? null;
            if (isCreate && position === null) {
                const [tail] = await transaction
                    .select({ position: projects.position })
                    .from(projects)
                    .where(eq(projects.status, 'planning'))
                    .orderBy(asc(projects.position));
                position = (tail?.position ?? -1) + 1;
            }

            const payload: ProjectCreate = {
                projectId: input.projectId ?? crypto.randomUUID(),
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

            let project;
            if (input.projectId) {
                const [updated] = await transaction
                    .update(projects)
                    .set(payload)
                    .where(eq(projects.projectId, input.projectId))
                    .returning();
                if (!updated) {
                    throw new Error(`projectUpsert: row ${input.projectId} not found`);
                }
                project = updated;
            } else {
                const [inserted] = await transaction.insert(projects).values(payload).returning();
                if (!inserted) {
                    throw new Error('projectUpsert: insert returned no rows');
                }
                project = inserted;
            }

            // Archive the source request in the same transaction. A
            // failure on either side rolls both back — no half-converted
            // project lingering, no orphaned archived request.
            if (sourceRequest) {
                await transaction
                    .update(projectRequests)
                    .set({ status: 'archived', updatedAt: now })
                    .where(eq(projectRequests.projectRequestId, sourceRequest.projectRequestId));
            }

            return {
                project,
                sourceRequest: sourceRequest ? { ...sourceRequest, status: 'archived' as const, updatedAt: now } : null,
            };
        });

        return toGqlProject(result.project, [], result.sourceRequest);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
