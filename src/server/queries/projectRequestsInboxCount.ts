import { and, eq, isNull, sql } from 'drizzle-orm';
import { projectRequests, projects } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';

// Count of verified incoming requests Cem hasn't archived or converted
// yet. The workspace hub's projects tile renders this as a small badge
// so the count is visible without opening `/workspace/projects`.
//
// "Untriaged" = `status = emailVerified` AND no `Projects` row links
// back via `sourceRequestId`. Archived rows and rows already converted
// are excluded; the join is a `LEFT JOIN ... IS NULL`.
export async function projectRequestsInboxCount(requestingSession: GqlSSession, serverRuntime: ServerRuntime): Promise<number> {
    try {
        const [row] = await serverRuntime.db
            .select({ count: sql<number>`count(*)::int` })
            .from(projectRequests)
            .leftJoin(projects, eq(projects.sourceRequestId, projectRequests.projectRequestId))
            .where(and(eq(projectRequests.status, 'emailVerified'), isNull(projects.projectId)));
        return row?.count ?? 0;
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
