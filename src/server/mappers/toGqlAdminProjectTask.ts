import type { AdminProjectTask } from '../db/schema';
import type { GqlSAdminProjectTask } from '../graphql/generated';

export function toGqlAdminProjectTask(row: AdminProjectTask): GqlSAdminProjectTask {
    return {
        taskId: row.taskId,
        projectId: row.projectId,
        title: row.title,
        notes: row.notes,
        status: row.status,
        position: row.position,
        dueAt: row.dueAt,
        completedAt: row.completedAt,
        effort: row.effort,
        whenBucket: row.whenBucket,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
