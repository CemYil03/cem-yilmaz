import { and, inArray, isNull, sql } from 'drizzle-orm';
import { tasks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';

// Count of open standalone todos — `projectId IS NULL` and status in
// (`todo`, `doing`). The workspace hub's Todos tile renders this as a
// small badge so "still to do" is visible without opening the page.
// `done` rows are intentionally excluded so completing a todo makes the
// badge tick down, not stay stuck on lifetime volume.
export async function adminStandaloneTaskOpenCount(requestingSession: GqlSSession, serverRuntime: ServerRuntime): Promise<number> {
    try {
        const [row] = await serverRuntime.db
            .select({ count: sql<number>`count(*)::int` })
            .from(tasks)
            .where(and(isNull(tasks.projectId), inArray(tasks.status, ['todo', 'doing'])));
        return row?.count ?? 0;
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
