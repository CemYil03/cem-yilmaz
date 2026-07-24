import { asc, isNull } from 'drizzle-orm';
import { tasks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminProjectTask, GqlSSession } from '../graphql/generated';
import { toGqlAdminProjectTask } from '../mappers/toGqlAdminProjectTask';

// Standalone todos: tasks with `projectId IS NULL`. Surfaced on the Todos
// tab of `/workspace/projects`. AdminProject-bound tasks are reached through
// `AdminProject.tasks` (eagerly loaded by `projectsList`), so this query
// intentionally never returns them — the two surfaces stay disjoint.
export async function adminStandaloneTaskFindMany(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminProjectTask[]> {
    try {
        const rows = await serverRuntime.db.select().from(tasks).where(isNull(tasks.projectId)).orderBy(asc(tasks.position));
        return rows.map(toGqlAdminProjectTask);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
