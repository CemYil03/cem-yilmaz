import { and, eq } from 'drizzle-orm';
import { fileUploads, projectFiles } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';

// Text-ish media types we can hand an agent as a UTF-8 string. Mirrors the
// `previewKindFor` classification the chat attachment dialog uses
// (`src/web/chat/chatAttachmentPreview.ts`) but kept server-local so the
// query has no web dependency. Anything not matched here (PDF, images,
// archives) is binary as far as the agent is concerned — see `readable: false`.
const TEXT_LIKE_MEDIA_TYPES = new Set<string>([
    'application/json',
    'application/ld+json',
    'application/xml',
    'application/yaml',
    'application/x-yaml',
    'application/javascript',
    'application/typescript',
    'application/x-sh',
    'application/sql',
    'text/yaml',
    'text/x-yaml',
    'text/csv',
    'text/tab-separated-values',
]);

function isTextMediaType(mediaType: string): boolean {
    const normalized = mediaType.toLowerCase();
    return normalized.startsWith('text/') || TEXT_LIKE_MEDIA_TYPES.has(normalized);
}

// Discriminated result: a readable text file yields its decoded `content`; a
// binary file yields `readable: false` plus the download `url` so the caller
// can point the user at it instead of dumping bytes into the model context.
export type AdminProjectFileContent =
    | { readable: true; projectFileId: string; filename: string; mediaType: string; size: number; content: string }
    | { readable: false; projectFileId: string; filename: string; mediaType: string; size: number; url: string };

// Loads one project file's underlying upload and decodes it to UTF-8 text when
// the media type is text-ish. Ownership is enforced by scoping the join to the
// requesting admin's `userId` on `fileUploads` — a file whose upload belongs to
// someone else (or a guessed id) reads as not-found rather than leaking bytes.
// The projects sub-agent reaches this through `toolProjectFileContentGet`.
//
// Throws when the file does not exist or is not owned by the admin.
export async function adminProjectFileContentFindOne(
    projectFileId: string,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<AdminProjectFileContent> {
    const userId = requestingSession.userId;
    if (!userId) {
        throw new Error('adminProjectFileContentFindOne: anonymous session cannot read project files');
    }
    try {
        const [row] = await serverRuntime.db
            .select({ file: projectFiles, upload: fileUploads })
            .from(projectFiles)
            .innerJoin(fileUploads, eq(fileUploads.fileUploadId, projectFiles.fileUploadId))
            .where(and(eq(projectFiles.projectFileId, projectFileId), eq(fileUploads.userId, userId)))
            .limit(1);

        if (!row) throw new Error(`project file ${projectFileId} not found`);

        const { upload } = row;
        if (!isTextMediaType(upload.mediaType)) {
            return {
                readable: false,
                projectFileId,
                filename: upload.filename,
                mediaType: upload.mediaType,
                size: upload.size,
                url: `/api/file-uploads/${upload.fileUploadId}`,
            };
        }

        return {
            readable: true,
            projectFileId,
            filename: upload.filename,
            mediaType: upload.mediaType,
            size: upload.size,
            content: Buffer.from(upload.bytes).toString('utf8'),
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
