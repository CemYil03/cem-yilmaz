import { asc, desc, eq, inArray, isNotNull } from 'drizzle-orm';
import { projectActivities, projectRequests, projects, tasks } from '../db/schema';
import type { Project, ProjectActivity, ProjectRequest, Task } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSProject, GqlSProjectStatus, GqlSSession } from '../graphql/generated';
import { toGqlProject } from '../mappers/toGqlProject';

// Lists every project (optionally narrowed by status) with its tasks,
// activities and source request joined in. The board on
// `/workspace/projects` renders every column at once, so eager-loading
// tasks and activities here saves an N+1 round trip per project. Ordered
// by status (the `Projects_status_position_idx` covering it) then
// position within the status — the client groups by status to render the
// kanban-style columns.
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

        const projectIds = projectRows.map((row) => row.project.projectId);

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

        // Phase 3 — fetch every activity row for the same projects in one
        // query, ordered newest-first so the timeline UI can render the
        // bucket as-is. Total work seconds (sum of `durationSec` over
        // `kind = work`) is computed in the same pass — running timers
        // (`durationSec IS NULL`) contribute 0; the client adds the live
        // seconds for the currently-running timer separately.
        const activityRows = await serverRuntime.db
            .select()
            .from(projectActivities)
            .where(inArray(projectActivities.projectId, projectIds))
            .orderBy(desc(projectActivities.occurredAt));
        const activitiesByProject = new Map<string, ProjectActivity[]>();
        const totalWorkByProject = new Map<string, number>();
        for (const activity of activityRows) {
            const bucket = activitiesByProject.get(activity.projectId) ?? [];
            bucket.push(activity);
            activitiesByProject.set(activity.projectId, bucket);
            if (activity.kind === 'work' && activity.durationSec) {
                totalWorkByProject.set(activity.projectId, (totalWorkByProject.get(activity.projectId) ?? 0) + activity.durationSec);
            }
        }

        return projectRows.map((row: { project: Project; sourceRequest: ProjectRequest | null }) =>
            toGqlProject(
                row.project,
                tasksByProject.get(row.project.projectId) ?? [],
                row.sourceRequest,
                activitiesByProject.get(row.project.projectId) ?? [],
                totalWorkByProject.get(row.project.projectId) ?? 0,
            ),
        );
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
