import type { Project, ProjectActivity, ProjectRequest, Task } from '../db/schema';
import type { GqlSProject } from '../graphql/generated';
import { toGqlProjectActivity } from './toGqlProjectActivity';
import { toGqlTask } from './toGqlTask';

// `tasks` is supplied eagerly by the list query — the projects board renders
// every task alongside its project, so a sub-resolver round-trip per row
// would just be N+1 churn. `sourceRequest` is similarly joined in once at
// list time; pass `null` for hand-created projects with no source request.
// `activities` is joined the same way and ordered newest-first by the
// caller (`projectsList`). `totalWorkSec` is precomputed against the same
// row set so the project card can render the total without a follow-up
// roundtrip.
//
// Note: re-exporting `toGqlProjectRequest` here would create a cycle with
// `toGqlProjectRequest.ts` (which imports this file for its
// `convertedProject` field). The list query is responsible for building
// the unwrapped `sourceRequest` shape and handing it in.
export function toGqlProject(
    row: Project,
    tasks: ReadonlyArray<Task>,
    sourceRequest: ProjectRequest | null,
    activities: ReadonlyArray<ProjectActivity> = [],
    totalWorkSec: number = 0,
): GqlSProject {
    return {
        projectId: row.projectId,
        title: row.title,
        description: row.description,
        notes: row.notes,
        status: row.status,
        position: row.position,
        sourceRequest: sourceRequest
            ? {
                  projectRequestId: sourceRequest.projectRequestId,
                  chatId: sourceRequest.chatId,
                  name: sourceRequest.name,
                  email: sourceRequest.email,
                  company: sourceRequest.company,
                  projectType: sourceRequest.projectType,
                  description: sourceRequest.description,
                  budget: sourceRequest.budget,
                  timeline: sourceRequest.timeline,
                  status: sourceRequest.status,
                  verifiedAt: sourceRequest.verifiedAt,
                  createdAt: sourceRequest.createdAt,
                  updatedAt: sourceRequest.updatedAt,
                  convertedProject: null,
              }
            : null,
        startedAt: row.startedAt,
        completedAt: row.completedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        tasks: tasks.map(toGqlTask),
        activities: activities.map(toGqlProjectActivity),
        totalWorkSec,
    };
}
