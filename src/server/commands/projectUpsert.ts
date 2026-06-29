import { eq } from 'drizzle-orm';
import { projects } from '../db/schema';
import type { ProjectCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationProjectUpsertArgs, GqlSProject, GqlSSession } from '../graphql/generated';
import { toGqlProject } from '../mappers/toGqlProject';

// Two-phase upsert: Phase 1 builds the payload, Phase 2 runs the single DB
// call wrapped in try/catch. Cross-status moves work by passing the new
// status here — `position` is set to whatever the editor chose for the
// target column. `sourceRequestId` is only meaningful when the row is
// being created from a request (via `projectFromRequest`); the editor
// never sets it manually.
export async function projectUpsert(
    args: GqlSAdminMutationProjectUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSProject> {
    const { input } = args;

    // Phase 1 — payload construction.
    const projectId = input.projectId ?? crypto.randomUUID();
    const now = new Date();
    const payload: ProjectCreate = {
        projectId,
        title: input.title,
        description: input.description ?? null,
        notes: input.notes ?? null,
        status: input.status,
        position: input.position,
        sourceRequestId: input.sourceRequestId ?? null,
        startedAt: input.startedAt ?? null,
        completedAt: input.completedAt ?? null,
        updatedAt: now,
    };

    // Phase 2 — single-statement DB call (no transaction needed).
    try {
        if (input.projectId) {
            const [updated] = await serverRuntime.db
                .update(projects)
                .set(payload)
                .where(eq(projects.projectId, input.projectId))
                .returning();
            if (!updated) {
                throw new Error(`projectUpsert: row ${input.projectId} not found`);
            }
            return toGqlProject(updated, [], null);
        }
        const [inserted] = await serverRuntime.db.insert(projects).values(payload).returning();
        if (!inserted) {
            throw new Error('projectUpsert: insert returned no rows');
        }
        return toGqlProject(inserted, [], null);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
