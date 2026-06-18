import { createFileRoute } from '@tanstack/react-router';
import { fileUploadLoad } from '../../server/queries/fileUploadLoad';
import { db } from '../../server/db';
import { environmentVariables } from '../../server/env/environmentVariablesCreate';
import { sessionUpsert } from '../../server/utils/sessionUpsert';
import { sessionUtils } from '../../server/utils/sessionUtils';
import { loggerCreate } from '../../server/utils/loggerCreate';

const log = loggerCreate(db);

// GET /api/file-uploads/:fileUploadId — streams the persisted bytes back with
// the original media type. Authorization today is "the requester is the user
// that owns this file upload" — chats don't yet model membership, so a
// participant-of-some-chat rule has nothing to read against. When chat (or any
// other consumer) grows membership semantics, the same handler will widen the
// check to allow participants without any wire-format change.
//
// Same-origin only — `FileUpload.url` resolves to a server-rooted path,
// so the browser sends the session cookie automatically with any `<img>` /
// `<a>` request. No CORS, no signed URLs.
export const Route = createFileRoute('/api/file-uploads_/$fileUploadId')({
    server: {
        handlers: {
            GET: async ({ request, params }) => {
                const existingSessionId = sessionUtils.getSessionIdFromRequest(environmentVariables.sessionCookie, request);
                const session = await sessionUpsert(db, log, existingSessionId, request.headers.get('user-agent'));
                const setCookie = sessionUtils.createSetSessionCookie(environmentVariables.sessionCookie, session);

                if (!session.userId) {
                    return new Response('Unauthorized', {
                        status: 401,
                        headers: { 'Set-Cookie': setCookie },
                    });
                }

                const fileUpload = await fileUploadLoad(db, params.fileUploadId);
                if (!fileUpload) {
                    return new Response('Not found', {
                        status: 404,
                        headers: { 'Set-Cookie': setCookie },
                    });
                }
                if (fileUpload.userId !== session.userId) {
                    // Don't leak the file upload's existence. 404 instead of
                    // 403 — same response shape as the missing-row branch.
                    return new Response('Not found', {
                        status: 404,
                        headers: { 'Set-Cookie': setCookie },
                    });
                }

                // `fileUpload.bytes` is a Node `Buffer` — at runtime it IS a
                // `Uint8Array` view onto an `ArrayBufferLike`, but the DOM
                // `BodyInit` typing only accepts `BufferSource` whose backing
                // store is `ArrayBuffer` (not `SharedArrayBuffer`). Copy into
                // a fresh `ArrayBuffer` so the type matches without relying
                // on the structural overlap.
                const safeFilename = fileUpload.filename.replace(/"/g, '');
                const body = new ArrayBuffer(fileUpload.bytes.byteLength);
                new Uint8Array(body).set(fileUpload.bytes);
                return new Response(body, {
                    status: 200,
                    headers: {
                        'Content-Type': fileUpload.mediaType,
                        'Content-Length': String(fileUpload.size),
                        'Content-Disposition': `inline; filename="${safeFilename}"`,
                        'Cache-Control': 'private, max-age=86400',
                        'Set-Cookie': setCookie,
                    },
                });
            },
        },
    },
});
