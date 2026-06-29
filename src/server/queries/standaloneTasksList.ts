import { asc, isNull } from 'drizzle-orm';
import { tasks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession, GqlSTask } from '../graphql/generated';
import { toGqlTask } from '../mappers/toGqlTask';

// Standalone todos: tasks with `projectId IS NULL`. Surfaced on the Todos
// tab of `/workspace/projects`. Project-bound tasks are reached through
// `Project.tasks` (eagerly loaded by `projectsList`), so this query
// intentionally never returns them — the two surfaces stay disjoint.
export async function standaloneTasksList(requestingSession: GqlSSession, serverRuntime: ServerRuntime): Promise<GqlSTask[]> {
    try {
        const rows = await serverRuntime.db.select().from(tasks).where(isNull(tasks.projectId)).orderBy(asc(tasks.position));
        return rows.map(toGqlTask);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
