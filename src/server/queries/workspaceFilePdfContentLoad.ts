import { eq } from 'drizzle-orm';
import { db } from '../db';
import { fileUploads, workspaceFiles } from '../db/schema';
import { verifyServerToken } from '../utils/serverToken';

// Server-only loader for the `/server/workspace-file-pdf/:id` render surface
// (the print layout headless Chromium captures into a PDF — see
// `docs/features/workspace-files.md` and
// `docs/architecture/server-side-rendering.md`).
//
// The headless browser has no session cookie, so this authenticates with the
// short-lived HMAC token minted by the download route (`serverToken.ts`),
// bound to the `workspaceFileId`. A valid token is proof the request came from
// our own capture pipeline for this exact file — the ownership check already
// happened in the download route before the token was minted, so we do not
// re-scope by `userId` here (we have no session to scope against). An invalid
// or expired token returns `null` and the route renders nothing sensitive.

export interface WorkspaceFilePdfContent {
    title: string;
    content: string;
}

export async function workspaceFilePdfContentLoad(workspaceFileId: string, token: string): Promise<WorkspaceFilePdfContent | null> {
    if (!verifyServerToken(token, workspaceFileId)) return null;

    const [row] = await db
        .select({ file: workspaceFiles, upload: fileUploads })
        .from(workspaceFiles)
        .innerJoin(fileUploads, eq(fileUploads.fileUploadId, workspaceFiles.fileUploadId))
        .where(eq(workspaceFiles.workspaceFileId, workspaceFileId))
        .limit(1);

    if (!row) return null;

    return {
        title: row.file.label ?? row.file.filename,
        content: Buffer.from(row.upload.bytes).toString('utf8'),
    };
}
