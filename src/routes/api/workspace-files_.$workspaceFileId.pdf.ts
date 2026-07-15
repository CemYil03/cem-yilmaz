import { createFileRoute } from '@tanstack/react-router';
import { and, eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { fileUploads, workspaceFiles } from '../../server/db/schema';
import { environmentVariables } from '../../server/env/environmentVariablesCreate';
import { browserCapturePdf } from '../../server/utils/browserCapture';
import { clientIpFromRequest } from '../../server/utils/clientIpFromRequest';
import { loggerCreate } from '../../server/utils/loggerCreate';
import { createServerToken } from '../../server/utils/serverToken';
import { sessionUpsert } from '../../server/utils/sessionUpsert';
import { sessionUtils } from '../../server/utils/sessionUtils';

const log = loggerCreate(db);

// GET /api/workspace-files/:workspaceFileId/pdf — renders an assistant-authored
// markdown document to a clean A4 PDF and streams it back as a download. See
// `docs/features/workspace-files.md`.
//
// Auth: session cookie must resolve to a user that OWNS the file (workspace
// files are admin-owned; an id belonging to another user reads as 404, same
// posture as the file-uploads download route — we don't leak existence).
//
// Rendering: we mint a short-lived HMAC token bound to the file id, then point
// the SSR pipeline's headless Chromium at the internal `/server/*` print route
// with that token. The token — not the session cookie — is how the headless
// browser authenticates, because it has no cookie jar. The `.md` filename is
// re-suffixed to `.pdf` for the download.
export const Route = createFileRoute('/api/workspace-files_/$workspaceFileId/pdf')({
    server: {
        handlers: {
            GET: async ({ request, params }) => {
                const existingSessionId = sessionUtils.getSessionIdFromRequest(environmentVariables.sessionCookie, request);
                const session = await sessionUpsert(
                    db,
                    log,
                    existingSessionId,
                    request.headers.get('user-agent'),
                    clientIpFromRequest(request),
                );
                const setCookie = sessionUtils.createSetSessionCookie(environmentVariables.sessionCookie, session);

                if (!session.userId) {
                    return new Response('Unauthorized', { status: 401, headers: { 'Set-Cookie': setCookie } });
                }

                // Ownership-scoped lookup: filter by both id and userId so a
                // guessed/stale id from another user is indistinguishable from
                // a missing row (404, not 403).
                const [row] = await db
                    .select({ filename: workspaceFiles.filename })
                    .from(workspaceFiles)
                    .innerJoin(fileUploads, eq(fileUploads.fileUploadId, workspaceFiles.fileUploadId))
                    .where(and(eq(workspaceFiles.workspaceFileId, params.workspaceFileId), eq(workspaceFiles.userId, session.userId)))
                    .limit(1);

                if (!row) {
                    return new Response('Not found', { status: 404, headers: { 'Set-Cookie': setCookie } });
                }

                try {
                    const token = createServerToken(params.workspaceFileId);
                    const url = `${environmentVariables.webPageUrl}/server/workspace-file-pdf/${params.workspaceFileId}?token=${encodeURIComponent(token)}`;
                    const pdf = await browserCapturePdf({ url, waitForSelector: '[data-pdf-ready]' });

                    const downloadName = `${row.filename.replace(/\.md$/i, '')}.pdf`;
                    const safeName = downloadName.replace(/"/g, '');
                    const body = new ArrayBuffer(pdf.byteLength);
                    new Uint8Array(body).set(pdf);
                    return new Response(body, {
                        status: 200,
                        headers: {
                            'Content-Type': 'application/pdf',
                            'Content-Length': String(pdf.byteLength),
                            'Content-Disposition': `attachment; filename="${safeName}"`,
                            'Set-Cookie': setCookie,
                        },
                    });
                } catch (error) {
                    log.error(error, session);
                    return new Response('Failed to render PDF', { status: 500, headers: { 'Set-Cookie': setCookie } });
                }
            },
        },
    },
});
