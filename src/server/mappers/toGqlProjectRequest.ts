import type { Project, ProjectRequest } from '../db/schema';
import type { GqlSProjectRequest } from '../graphql/generated';
import { toGqlProject } from './toGqlProject';

// `convertedProject` is the workspace projects row that was created from
// this request (via `projectsUpsert` with `sourceRequestId`). The list
// query joins it in; pass `null` for the hand-built admin view that has
// no project context. The OTP columns are intentionally omitted from the
// GraphQL surface — the admin UI is read-only triage, not OTP
// introspection.
export function toGqlProjectRequest(row: ProjectRequest, convertedProject: Project | null): GqlSProjectRequest {
    return {
        projectRequestId: row.projectRequestId,
        chatId: row.chatId,
        name: row.name,
        email: row.email,
        company: row.company,
        projectType: row.projectType,
        description: row.description,
        budget: row.budget,
        timeline: row.timeline,
        status: row.status,
        verifiedAt: row.verifiedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        convertedProject: convertedProject ? toGqlProject(convertedProject, [], null) : null,
    };
}
