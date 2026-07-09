import { desc, eq } from 'drizzle-orm';
import { projectRequests, projects } from '../db/schema';
import type { Project, ProjectRequest } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSProjectRequest, GqlSProjectRequestStatus, GqlSSession } from '../graphql/generated';
import { toGqlProjectRequest } from '../mappers/toGqlProjectRequest';

// Lists project requests, optionally narrowed by status. The Inbox tab on
// `/workspace/projects` calls this with `emailVerified` to surface only
// the rows Cem has actually been notified about. The unfiltered call
// returns every state for completeness (mostly useful for debugging /
// audit). Newest first — visitors care about recent submissions.
//
// `convertedProject` is built from a left join on `Projects.sourceRequestId`.
// The full row is dropped into `toGqlProjectRequest`, which only emits a
// shallow project shape (no nested tasks) to keep the payload bounded.
export async function adminProjectRequestFindMany(
    status: GqlSProjectRequestStatus | null,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSProjectRequest[]> {
    try {
        const rows = await serverRuntime.db
            .select({ request: projectRequests, convertedProject: projects })
            .from(projectRequests)
            .leftJoin(projects, eq(projects.sourceRequestId, projectRequests.projectRequestId))
            .where(status ? eq(projectRequests.status, status) : undefined)
            .orderBy(desc(projectRequests.createdAt));
        return rows.map((row: { request: ProjectRequest; convertedProject: Project | null }) =>
            toGqlProjectRequest(row.request, row.convertedProject),
        );
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
