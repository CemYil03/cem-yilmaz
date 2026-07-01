import type { Task } from '../db/schema';
import type { GqlSTask } from '../graphql/generated';

export function toGqlTask(row: Task): GqlSTask {
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
