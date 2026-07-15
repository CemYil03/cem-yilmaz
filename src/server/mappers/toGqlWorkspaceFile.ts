import type { FileUpload, WorkspaceFile } from '../db/schema';
import type { GqlSWorkspaceFile } from '../graphql/generated';
import { toGqlFileUpload } from './toGqlFileUpload';

// One standalone workspace-file row mapped to its GraphQL shape. `content` is
// the decoded UTF-8 body of the underlying upload — the caller decodes the
// bytes (they live on `fileUploads`, loaded alongside the row) and passes them
// in so this mapper stays pure. `fileUpload.url` still points at the download
// route for raw-byte access.
export function toGqlWorkspaceFile(row: WorkspaceFile, fileUpload: FileUpload, content: string): GqlSWorkspaceFile {
    return {
        workspaceFileId: row.workspaceFileId,
        filename: row.filename,
        label: row.label,
        content,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        fileUpload: toGqlFileUpload(fileUpload),
    };
}
