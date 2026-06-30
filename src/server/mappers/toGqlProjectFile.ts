import type { FileUpload, ProjectFile } from '../db/schema';
import type { GqlSProjectFile } from '../graphql/generated';
import { toGqlFileUpload } from './toGqlFileUpload';

// One project-file row plus its underlying upload mapped to GraphQL. The
// upload is supplied eagerly by the list / detail query so the field
// resolver doesn't trigger a per-row lookup. `activityId` is the optional
// backlink to the activity this file was born from.
export function toGqlProjectFile(row: ProjectFile, fileUpload: FileUpload): GqlSProjectFile {
    return {
        projectFileId: row.projectFileId,
        projectId: row.projectId,
        activityId: row.activityId,
        fileUpload: toGqlFileUpload(fileUpload),
        label: row.label,
        kind: row.kind,
        pinned: row.pinned,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
