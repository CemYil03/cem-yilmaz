import type { FileUpload } from '../db/schema';
import type { GqlSFileUpload } from '../graphql/generated';

// Server-rooted URL the bytes are streamed back from. Centralized so every
// mapper, the upload route, and the download route agree on the path. Path
// only — same-origin — so the cookie auth the rest of the app uses applies
// without any cross-origin handling.
function fileUploadUrl(fileUploadId: string): string {
    return `/api/file-uploads/${fileUploadId}`;
}

// One file row mapped to its GraphQL shape. Bytes are deliberately not
// surfaced inline — `url` points at the download route, which streams the
// raw payload with the correct media type. Reused by chat attachments and
// project file resources alike.
export function toGqlFileUpload(fileUpload: FileUpload): GqlSFileUpload {
    return {
        fileUploadId: fileUpload.fileUploadId,
        filename: fileUpload.filename,
        mediaType: fileUpload.mediaType,
        size: fileUpload.size,
        url: fileUploadUrl(fileUpload.fileUploadId),
    };
}
