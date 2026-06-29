import { asc, eq, isNotNull } from 'drizzle-orm';
import { projectRequests, projects, tasks } from '../db/schema';
import type { Project, ProjectRequest, Task } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSProject, GqlSProjectStatus, GqlSSession } from '../graphql/generated';
import { toGqlProject } from '../mappers/toGqlProject';

// Lists every project (optionally narrowed by status) with its tasks and
// source request joined in. The board on `/workspace/projects` renders
// every column at once, so eager-loading tasks here saves an N+1 round
// trip per project. Ordered by status (the `Projects_status_position_idx`
// covering it) then position within the status — the client groups by
// status to render the kanban-style columns.
export async function projectsList(
    status: GqlSProjectStatus | null,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSProject[]> {
    try {
        // Phase 1 — fetch projects + their (possibly null) source requests.
        const projectRows = await serverRuntime.db
            .select({ project: projects, sourceRequest: projectRequests })
            .from(projects)
            .leftJoin(projectRequests, eq(projectRequests.projectRequestId, projects.sourceRequestId))
            .where(status ? eq(projects.status, status) : undefined)
            .orderBy(asc(projects.status), asc(projects.position));

        if (projectRows.length === 0) return [];

        // Phase 2 — fetch every task that belongs to any of the returned
        // projects in one query, bucket by projectId in memory. Cheaper
        // than N task queries; cheap to skip when no projects came back.
        const taskRows = await serverRuntime.db.select().from(tasks).where(isNotNull(tasks.projectId)).orderBy(asc(tasks.position));
        const tasksByProject = new Map<string, Task[]>();
        for (const task of taskRows) {
            if (!task.projectId) continue;
            const bucket = tasksByProject.get(task.projectId) ?? [];
            bucket.push(task);
            tasksByProject.set(task.projectId, bucket);
        }

        return projectRows.map((row: { project: Project; sourceRequest: ProjectRequest | null }) =>
            toGqlProject(row.project, tasksByProject.get(row.project.projectId) ?? [], row.sourceRequest),
        );
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
