import { createFileRoute } from '@tanstack/react-router';
import { fileUploadCreate } from '../../server/commands/fileUploadCreate';
import { db } from '../../server/db';
import { environmentVariables } from '../../server/env/environmentVariablesCreate';
import { sessionUpsert } from '../../server/utils/sessionUpsert';
import { sessionUtils } from '../../server/utils/sessionUtils';
import { clientIpFromRequest } from '../../server/utils/clientIpFromRequest';
import { loggerCreate } from '../../server/utils/loggerCreate';

const log = loggerCreate(db);

// 10 MB per file. Conservative starting point — Gemini's effective inline
// payload budget is well above this, but we'd rather reject early than
// encode and stream a 50 MB blob through the LLM. Bump if a feature actually
// needs more.
const FILE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

// POST /api/file-uploads — multipart/form-data upload. The chat composer fires
// one request per file as it's attached so the user-facing tile state can flip
// `uploading → uploaded` independently per file; other consumers can use the
// same endpoint to stash a file and reference it later. Each successful
// response is `{ fileUploadId, filename, mediaType, size }` — the
// `fileUploadId` is what callers later pass through (e.g.
// `chatMessageCreate(..., fileUploadIds: ...)`) so the server can link the
// bytes onto the consumer's row inside the same transaction.
//
// Auth: the session cookie must already resolve to a user. Anonymous sessions
// can't upload — they have no user to own the row.
export const Route = createFileRoute('/api/file-uploads')({
    server: {
        handlers: {
            POST: async ({ request }) => {
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
                    return new Response(JSON.stringify({ error: 'Unauthorized: anonymous session has no user' }), {
                        status: 401,
                        headers: { 'Content-Type': 'application/json', 'Set-Cookie': setCookie },
                    });
                }

                let formData: FormData;
                try {
                    formData = await request.formData();
                } catch (error) {
                    log.error(error, session);
                    return new Response(JSON.stringify({ error: 'Could not parse multipart form data' }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json', 'Set-Cookie': setCookie },
                    });
                }

                // Single-file POST. The client doesn't rely on a particular
                // form field name beyond a single one — we accept the first
                // file entry we see so a `<input name="file">` and
                // `<input name="attachment">` both work.
                let file: File | null = null;
                for (const value of formData.values()) {
                    if (value instanceof File) {
                        file = value;
                        break;
                    }
                }
                if (!file) {
                    return new Response(JSON.stringify({ error: 'No file in form data' }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json', 'Set-Cookie': setCookie },
                    });
                }

                if (file.size > FILE_UPLOAD_MAX_BYTES) {
                    return new Response(
                        JSON.stringify({ error: `File too large: ${file.size} bytes exceeds ${FILE_UPLOAD_MAX_BYTES}-byte limit` }),
                        {
                            status: 413,
                            headers: { 'Content-Type': 'application/json', 'Set-Cookie': setCookie },
                        },
                    );
                }

                const arrayBuffer = await file.arrayBuffer();
                const bytes = Buffer.from(arrayBuffer);

                try {
                    const fileUpload = await fileUploadCreate(db, {
                        userId: session.userId,
                        filename: file.name,
                        // Browsers occasionally send empty media types for
                        // unknown extensions — fall back to a generic so
                        // downstream code doesn't have to special-case the
                        // empty string.
                        mediaType: file.type || 'application/octet-stream',
                        bytes,
                    });

                    return new Response(
                        JSON.stringify({
                            fileUploadId: fileUpload.fileUploadId,
                            filename: fileUpload.filename,
                            mediaType: fileUpload.mediaType,
                            size: fileUpload.size,
                        }),
                        {
                            status: 201,
                            headers: { 'Content-Type': 'application/json', 'Set-Cookie': setCookie },
                        },
                    );
                } catch (error) {
                    log.error(error, session);
                    return new Response(JSON.stringify({ error: 'Failed to persist file upload' }), {
                        status: 500,
                        headers: { 'Content-Type': 'application/json', 'Set-Cookie': setCookie },
                    });
                }
            },
        },
    },
});
