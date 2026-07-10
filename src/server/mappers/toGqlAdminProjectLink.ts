import type { AdminProjectLink } from '../db/schema';
import type { GqlSAdminProjectLink } from '../graphql/generated';

// Straight one-to-one mapping. `activityId` is the optional backlink to the
// activity row this link was born from; the resource survives the activity's
// deletion (FK cascade-set-null in the DB).
export function toGqlAdminProjectLink(row: AdminProjectLink): GqlSAdminProjectLink {
    return {
        projectLinkId: row.projectLinkId,
        projectId: row.projectId,
        activityId: row.activityId,
        url: row.url,
        label: row.label,
        kind: row.kind,
        pinned: row.pinned,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
