import { createFileRoute } from '@tanstack/react-router';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateSpeech } from 'ai';
import { environmentVariables } from '../../server/env/environmentVariablesCreate';
import { sessionUpsert } from '../../server/utils/sessionUpsert';
import { sessionUtils } from '../../server/utils/sessionUtils';
import { clientIpFromRequest } from '../../server/utils/clientIpFromRequest';
import { db } from '../../server/db';
import { loggerCreate } from '../../server/utils/loggerCreate';

const log = loggerCreate(db);

const TEXT_MAX_LENGTH = 4000;

// POST /api/tts — converts `{ text }` to audio bytes via Gemini TTS.
// Returns raw WAV audio. Available to both authenticated and anonymous
// sessions (visitor-chat users have anonymous sessions and should also be
// able to hear replies). The Google API key is the same one used for chat.
export const Route = createFileRoute('/api/tts')({
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

                let body: unknown;
                try {
                    body = await request.json();
                } catch {
                    return new Response('Invalid JSON', { status: 400, headers: { 'Set-Cookie': setCookie } });
                }

                const rawText =
                    typeof body === 'object' &&
                    body !== null &&
                    'text' in body &&
                    typeof (body as Record<string, unknown>).text === 'string'
                        ? String((body as Record<string, unknown>).text).trim()
                        : '';
                const text = rawText;

                if (!text) {
                    return new Response('text is required', { status: 400, headers: { 'Set-Cookie': setCookie } });
                }
                if (text.length > TEXT_MAX_LENGTH) {
                    return new Response(`text exceeds ${TEXT_MAX_LENGTH} character limit`, {
                        status: 400,
                        headers: { 'Set-Cookie': setCookie },
                    });
                }

                const googleApiKey = environmentVariables.googleGenerativeAiApiKey;
                if (!googleApiKey) {
                    return new Response('TTS unavailable: Google API key not configured', {
                        status: 503,
                        headers: { 'Set-Cookie': setCookie },
                    });
                }

                const google = createGoogleGenerativeAI({ apiKey: googleApiKey });

                try {
                    const result = await generateSpeech({
                        model: google.speech('gemini-2.5-flash-preview-tts'),
                        text,
                        voice: 'Zephyr',
                        instructions: 'Speak at a natural, conversational pace — not slow, not rushed.',
                    });

                    const audioBytes = result.audio.uint8Array;
                    const audioBuffer = new ArrayBuffer(audioBytes.byteLength);
                    new Uint8Array(audioBuffer).set(audioBytes);

                    return new Response(audioBuffer, {
                        status: 200,
                        headers: {
                            'Content-Type': result.audio.mediaType,
                            'Content-Length': String(audioBytes.byteLength),
                            'Cache-Control': 'no-store',
                            'Set-Cookie': setCookie,
                        },
                    });
                } catch (err) {
                    const message = err instanceof Error ? err.message : 'Unknown TTS error';
                    return new Response(message, { status: 500, headers: { 'Set-Cookie': setCookie } });
                }
            },
        },
    },
});
