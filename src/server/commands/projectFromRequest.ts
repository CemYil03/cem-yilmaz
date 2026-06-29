import { asc, eq } from 'drizzle-orm';
import { projectRequests, projects } from '../db/schema';
import type { ProjectCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationProjectFromRequestArgs, GqlSProject, GqlSSession } from '../graphql/generated';
import { toGqlProject } from '../mappers/toGqlProject';

// Project-type labels mirror what the notification email uses — see
// `projectRequestNotifySend` — so the converted project title reads the
// same as the email that announced the request.
const PROJECT_TYPE_LABELS: Record<string, string> = {
    webApp: 'Web app',
    mobile: 'Mobile app',
    consulting: 'Consulting',
    aiIntegration: 'AI integration',
    other: 'Other',
};

// Atomically converts a verified `ProjectRequest` into a `Project`:
//
// 1. Insert a `Projects` row in state `planning` with `sourceRequestId`
//    linking back. Title is composed from the visitor's company / name
//    plus the project type label; the body of the brief lands in
//    `description` and the budget/timeline pair is appended to `notes`
//    so the admin sees both at a glance without opening the source row.
// 2. Mark the source request `archived` so the Inbox tab hides it.
//
// Wrapped in a single transaction: a failure on either statement leaves
// the request in its prior state, no half-converted project lingering.
// Rejects rows that aren't `emailVerified` — the OTP gate is the whole
// reason this flow exists, and converting a `pendingOtp` row would
// surface unverified contact details on the project board.
export async function projectFromRequest(
    args: GqlSAdminMutationProjectFromRequestArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSProject> {
    // Phase 1 — preflight read + payload construction (outside the
    // transaction so we can fail fast on bad input).
    const [request] = await serverRuntime.db
        .select()
        .from(projectRequests)
        .where(eq(projectRequests.projectRequestId, args.projectRequestId));
    if (!request) {
        throw new Error(`projectFromRequest: row ${args.projectRequestId} not found`);
    }
    if (request.status !== 'emailVerified') {
        throw new Error(`projectFromRequest: row ${args.projectRequestId} is in state '${request.status}', expected 'emailVerified'`);
    }

    const typeLabel = PROJECT_TYPE_LABELS[request.projectType] ?? request.projectType;
    const titleSubject = request.company?.trim() ? request.company : request.name;
    const title = `${typeLabel}: ${titleSubject}`;

    const notesParts: string[] = [];
    if (request.budget) notesParts.push(`Budget: ${request.budget}`);
    if (request.timeline) notesParts.push(`Timeline: ${request.timeline}`);
    notesParts.push(`Contact: ${request.name} <${request.email}>`);
    const notes = notesParts.join('\n');

    // New projects land at the end of the `planning` column. Read the
    // current max-position so the inserted row sorts after existing rows.
    const [tail] = await serverRuntime.db
        .select({ position: projects.position })
        .from(projects)
        .where(eq(projects.status, 'planning'))
        .orderBy(asc(projects.position));
    const position = (tail?.position ?? -1) + 1;

    const now = new Date();
    const projectInsert: ProjectCreate = {
        projectId: crypto.randomUUID(),
        title,
        description: request.description,
        notes,
        status: 'planning',
        position,
        sourceRequestId: request.projectRequestId,
        startedAt: null,
        completedAt: null,
        updatedAt: now,
    };

    // Phase 2 — transactional execution.
    try {
        const inserted = await serverRuntime.db.transaction(async (transaction) => {
            const [project] = await transaction.insert(projects).values(projectInsert).returning();
            if (!project) {
                throw new Error('projectFromRequest: insert returned no rows');
            }
            await transaction
                .update(projectRequests)
                .set({ status: 'archived', updatedAt: now })
                .where(eq(projectRequests.projectRequestId, request.projectRequestId));
            return project;
        });
        return toGqlProject(inserted, [], { ...request, status: 'archived', updatedAt: now });
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
