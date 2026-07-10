import type { AdminProject, AdminProjectRequest } from '../db/schema';
import type { GqlSAdminProjectRequest } from '../graphql/generated';
import { toGqlAdminProject } from './toGqlAdminProject';

// `convertedProject` is the workspace projects row that was created from
// this request (via `adminProjectsUpsert` with `sourceRequestId`). The list
// query joins it in; pass `null` for the hand-built admin view that has
// no project context. The OTP columns are intentionally omitted from the
// GraphQL surface — the admin UI is read-only triage, not OTP
// introspection.
export function toGqlAdminProjectRequest(row: AdminProjectRequest, convertedProject: AdminProject | null): GqlSAdminProjectRequest {
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
        convertedProject: convertedProject ? toGqlAdminProject(convertedProject, [], null) : null,
    };
}
