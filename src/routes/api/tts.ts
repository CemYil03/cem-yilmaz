import { createFileRoute } from '@tanstack/react-router';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateSpeech } from 'ai';
import { environmentVariables } from '../../server/env/environmentVariablesCreate';
import { sessionUpsert } from '../../server/utils/sessionUpsert';
import { sessionUtils } from '../../server/utils/sessionUtils';
import { clientIpFromRequest } from '../../server/utils/clientIpFromRequest';
import { db } from '../../server/db';
import { loggerCreate } from '../../server/utils/loggerCreate';
import { ttsContentHash } from '../../server/utils/ttsContentHash';
import { ttsAudioCacheLoad } from '../../server/queries/ttsAudioCacheLoad';
import { ttsAudioCacheUpsert } from '../../server/commands/ttsAudioCacheUpsert';
import { audioTranscodePcmToMp3Stream } from '../../server/utils/audioTranscode';
import { textToSentences } from '../../web/utils/textToSentences';

const log = loggerCreate(db);

const TEXT_MAX_LENGTH = 4000;

// TTS synthesis parameters — held as constants so the same `(voice, model,
// format)` tuple feeds both the cache key and the Gemini call. If any of
// these changes, the cache-key salt shifts and old rows become unreachable
// (which is what we want — a different voice IS a different clip).
const TTS_VOICE = 'Zephyr';
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const TTS_FORMAT = 'mp3';
const TTS_MEDIA_TYPE = 'audio/mpeg';

// POST /api/tts — converts `{ text }` to audio bytes via Gemini TTS.
//
// Cache: bytes are keyed by SHA-256 of `text|voice|model|format` and
// persisted to the `TtsAudioCache` table (see `src/server/db/schema.ts`).
// A hit returns the full MP3 in a single response; a miss streams MP3
// bytes to the client as they're synthesized (chunk-by-chunk) and writes
// the completed clip to the cache on success. Cache lookup and write
// happen inside the request path so the wire format is identical either
// way.
//
// Streaming pipeline on cache miss:
//   text
//     → `textToSentences` splits it into ~300-char chunks
//     → for each chunk (serially), `generateSpeech({ outputFormat: 'pcm' })`
//     → PCM bytes are written into one long-lived ffmpeg process
//     → ffmpeg's MP3 stdout is teed to the response ReadableStream and to
//       a Buffer accumulator
//   on ffmpeg close (all chunks done): write the accumulator to the cache
//   on client cancel: kill ffmpeg, skip the cache write
//
// `sessionUpsert` runs on every request and stays — it is the intended
// anchor for a future public-endpoint rate-limit.
//
// Available to both authenticated and anonymous sessions (visitor-chat
// users have anonymous sessions and should also be able to hear replies).
// The Google API key is the same one used for chat.
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

                // Cache lookup — same `(text, voice, model, format)` tuple
                // always resolves to the same hash. On hit, we skip Gemini
                // entirely; the second listen to any message is near-instant.
                const contentHash = ttsContentHash({ text, voice: TTS_VOICE, model: TTS_MODEL, format: TTS_FORMAT });
                const cached = await ttsAudioCacheLoad(db, contentHash);
                if (cached) {
                    const cachedBody = new ArrayBuffer(cached.bytes.byteLength);
                    new Uint8Array(cachedBody).set(cached.bytes);
                    return new Response(cachedBody, {
                        status: 200,
                        headers: {
                            'Content-Type': cached.mediaType,
                            'Content-Length': String(cached.size),
                            ETag: `"${contentHash}"`,
                            'Cache-Control': 'private, max-age=86400',
                            'Set-Cookie': setCookie,
                        },
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

                // Sentences are synthesized serially — first-chunk latency
                // beats total throughput here. Gemini's `generateSpeech` is
                // still a batch call per chunk; the win is that ffmpeg
                // starts emitting MP3 as soon as the FIRST chunk lands
                // instead of waiting for the whole clip.
                const chunks = textToSentences(text);
                if (chunks.length === 0) {
                    return new Response('text is required', { status: 400, headers: { 'Set-Cookie': setCookie } });
                }

                // Long-lived ffmpeg — we don't yet know the sample rate,
                // so it's spawned lazily once we get the first Gemini
                // response. The stream controller holds the wire back to
                // the browser; ffmpeg's stdout drives `controller.enqueue`.
                let ffmpegChild: ReturnType<typeof audioTranscodePcmToMp3Stream>['child'] | null = null;
                const mp3Accumulator: Buffer[] = [];
                let cancelled = false;
                let firstSampleRate: number | null = null;

                const stream = new ReadableStream<Uint8Array>({
                    start(controller) {
                        (async () => {
                            try {
                                for (const chunk of chunks) {
                                    if (cancelled) break;
                                    const result = await generateSpeech({
                                        model: google.speech(TTS_MODEL),
                                        text: chunk,
                                        voice: TTS_VOICE,
                                        outputFormat: 'pcm',
                                        instructions: 'Speak at a natural, conversational pace — not slow, not rushed.',
                                    });
                                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- `cancelled` may flip during the await.
                                    if (cancelled) break;

                                    // Gemini surfaces the sample rate via
                                    // `providerMetadata.google.sampleRate` — the
                                    // core SDK types this loosely, so we assert
                                    // the shape we care about.
                                    const googleMeta = result.providerMetadata.google as { sampleRate?: number } | undefined;
                                    const sampleRate =
                                        googleMeta && typeof googleMeta.sampleRate === 'number' ? googleMeta.sampleRate : 24_000;

                                    // First chunk: spawn ffmpeg, wire stdout
                                    // → response + accumulator, wire close →
                                    // cache write.
                                    if (!ffmpegChild) {
                                        firstSampleRate = sampleRate;
                                        const started = audioTranscodePcmToMp3Stream(sampleRate);
                                        ffmpegChild = started.child;

                                        ffmpegChild.stdout.on('data', (buf: Buffer) => {
                                            mp3Accumulator.push(buf);
                                            if (!cancelled) {
                                                try {
                                                    controller.enqueue(new Uint8Array(buf));
                                                } catch {
                                                    // Post-close enqueue — silently drop.
                                                }
                                            }
                                        });
                                        ffmpegChild.stderr.on('data', () => {
                                            // Not surfaced — non-zero exit is what we care about.
                                        });
                                        ffmpegChild.on('close', (code) => {
                                            if (cancelled) {
                                                try {
                                                    controller.close();
                                                } catch {}
                                                return;
                                            }
                                            if (code !== 0) {
                                                try {
                                                    controller.error(new Error(`ffmpeg exited with code ${code}`));
                                                } catch {}
                                                return;
                                            }
                                            try {
                                                controller.close();
                                            } catch {}
                                            const full = Buffer.concat(mp3Accumulator);
                                            void ttsAudioCacheUpsert(db, {
                                                contentHash,
                                                mediaType: TTS_MEDIA_TYPE,
                                                voice: TTS_VOICE,
                                                model: TTS_MODEL,
                                                format: TTS_FORMAT,
                                                size: full.byteLength,
                                                bytes: full,
                                            }).catch((err) => {
                                                console.error('ttsAudioCacheUpsert failed', err);
                                            });
                                        });
                                        ffmpegChild.on('error', (err) => {
                                            try {
                                                controller.error(err);
                                            } catch {}
                                        });
                                    } else if (firstSampleRate !== null && sampleRate !== firstSampleRate) {
                                        // Same voice/model should always return the same
                                        // sample rate. If Gemini disagrees mid-stream,
                                        // bail — mixing rates through one ffmpeg would
                                        // corrupt the output.
                                        cancelled = true;
                                        ffmpegChild.kill('SIGKILL');
                                        throw new Error(`Gemini returned inconsistent sample rate: ${sampleRate} vs ${firstSampleRate}`);
                                    }

                                    // Backpressure: wait for `drain` if
                                    // stdin.write returns false. Keeps
                                    // Node from ballooning memory on long
                                    // synths.
                                    const ok = ffmpegChild.stdin.write(result.audio.uint8Array);
                                    if (!ok) {
                                        await new Promise<void>((resolve) => ffmpegChild!.stdin.once('drain', () => resolve()));
                                    }
                                }
                                // All chunks synthesized — close stdin so
                                // ffmpeg flushes the final MP3 frames and
                                // emits `close`.
                                ffmpegChild?.stdin.end();
                            } catch (err) {
                                cancelled = true;
                                ffmpegChild?.kill('SIGKILL');
                                try {
                                    controller.error(err instanceof Error ? err : new Error(String(err)));
                                } catch {}
                            }
                        })();
                    },
                    cancel() {
                        // Client hung up mid-play — kill ffmpeg, skip the
                        // cache write. A partial cache row would poison
                        // the next request.
                        cancelled = true;
                        ffmpegChild?.kill('SIGKILL');
                    },
                });

                return new Response(stream, {
                    status: 200,
                    headers: {
                        'Content-Type': TTS_MEDIA_TYPE,
                        // No `Content-Length` — the length isn't known until
                        // ffmpeg finishes. Chunked transfer is implicit.
                        ETag: `"${contentHash}"`,
                        // Miss path is streamed and per-request. The full
                        // clip lands in the server cache for the next call
                        // (which then returns with `max-age=86400`), but
                        // this response itself must not be cached by any
                        // proxy — a partial stream is not a valid clip.
                        'Cache-Control': 'no-store',
                        'X-Accel-Buffering': 'no',
                        'Set-Cookie': setCookie,
                    },
                });
            },
        },
    },
});
