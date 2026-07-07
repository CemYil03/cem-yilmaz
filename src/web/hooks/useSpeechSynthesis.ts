import { useCallback, useRef, useState } from 'react';

// TTS via Gemini — POSTs cleaned text to `/api/tts` and plays the returned
// audio.
//
// Two playback modes are supported, chosen at speak-time:
//
//   1. MediaSource-Extensions pump (default, evergreen browsers). Bytes
//      from `response.body` are appended to a `SourceBuffer` as they
//      arrive; audio starts playing as soon as the first ~100 ms lands.
//      This is what shrinks perceived latency on cache misses — the
//      server streams MP3 chunk-by-chunk while Gemini synthesizes.
//
//   2. Blob fallback (any environment lacking MSE or `audio/mpeg` support).
//      Same shape as before this hook was rewritten: `response.blob()` →
//      `new Audio(url)`. First-audio latency = full download + Gemini
//      wall-clock, but functionality never breaks.
//
// The public interface adds `preload(text)` — SpeakButton wires it to
// `onMouseEnter` / `onFocus` so the fetch is already in flight by the time
// the user clicks. If the next `speak()` is called with the same text,
// the preload's in-flight response is adopted verbatim (no extra request).
//
// Global single-utterance semantics: `speak()` cancels any in-flight
// request or playing audio before starting a new one, so two messages can
// never overlap across the app.

type SpeechLang = 'de-DE' | 'en-US';
type SpeechState = 'idle' | 'loading' | 'speaking';

export interface UseSpeechSynthesis {
    // Always true — capability is server-side and unconditionally available.
    supported: true;
    state: SpeechState;
    speak: (text: string, lang: SpeechLang) => void;
    preload: (text: string) => void;
    cancel: () => void;
}

const PRELOAD_MIME = 'audio/mpeg';
const PRELOAD_GRACE_MS = 30_000;

interface PreloadEntry {
    text: string;
    controller: AbortController;
    responsePromise: Promise<Response>;
    graceTimer: ReturnType<typeof setTimeout> | null;
}

function canUseMediaSource(): boolean {
    if (typeof window === 'undefined') return false;
    if (typeof MediaSource === 'undefined') return false;
    try {
        return MediaSource.isTypeSupported(PRELOAD_MIME);
    } catch {
        return false;
    }
}

async function playViaMediaSource(
    response: Response,
    audioRef: React.MutableRefObject<HTMLAudioElement | null>,
    blobUrlRef: React.MutableRefObject<string | null>,
    onPlaying: () => void,
): Promise<void> {
    if (!response.body) throw new Error('TTS response has no body');

    const mediaSource = new MediaSource();
    const url = URL.createObjectURL(mediaSource);
    blobUrlRef.current = url;

    const audio = new Audio();
    audio.src = url;
    audioRef.current = audio;

    // Wait for MediaSource to open before we can add a SourceBuffer.
    await new Promise<void>((resolve) => {
        if (mediaSource.readyState === 'open') resolve();
        else mediaSource.addEventListener('sourceopen', () => resolve(), { once: true });
    });

    const sourceBuffer = mediaSource.addSourceBuffer(PRELOAD_MIME);

    let started = false;
    audio.addEventListener('playing', () => {
        if (!started) {
            started = true;
            onPlaying();
        }
    });

    const reader = response.body.getReader();
    const pending: Uint8Array[] = [];
    let readerDone = false;

    // Serialize `appendBuffer` calls — `SourceBuffer` throws if you call
    // it while `updating === true`. We queue pending chunks and drain on
    // `updateend`.
    const flush = () => {
        if (sourceBuffer.updating) return;
        const next = pending.shift();
        if (next) {
            // `SourceBuffer.appendBuffer` insists on an ArrayBuffer
            // (not SharedArrayBuffer) — copy into a fresh one so the
            // structural DOM type matches without relying on overlap.
            const copy = new ArrayBuffer(next.byteLength);
            new Uint8Array(copy).set(next);
            try {
                sourceBuffer.appendBuffer(copy);
            } catch {
                // MediaSource closed (e.g. cancelled) — swallow.
            }
        } else if (readerDone) {
            try {
                if (mediaSource.readyState === 'open') mediaSource.endOfStream();
            } catch {}
        }
    };
    sourceBuffer.addEventListener('updateend', flush);

    // Kick playback off immediately — the browser will wait on data as
    // needed and fire `playing` when the first frames decode.
    try {
        await audio.play();
    } catch {
        // Autoplay might be denied on some paths (not the click handler
        // path we're on, but be defensive). The `playing` listener above
        // still resolves the state transition when audio actually starts.
    }

    // Reader pump — writes into `pending`, kicks `flush` each turn.
    (async () => {
        try {
            for (;;) {
                const { value, done } = await reader.read();
                if (done) {
                    readerDone = true;
                    flush();
                    return;
                }
                if (value.byteLength > 0) {
                    pending.push(value);
                    flush();
                }
            }
        } catch {
            // Aborted or network error — audio's `error`/`ended` handlers
            // clean up state.
        }
    })();
}

async function playViaBlob(
    response: Response,
    audioRef: React.MutableRefObject<HTMLAudioElement | null>,
    blobUrlRef: React.MutableRefObject<string | null>,
    onPlaying: () => void,
): Promise<void> {
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    blobUrlRef.current = url;

    const audio = new Audio(url);
    audioRef.current = audio;
    audio.addEventListener('playing', () => onPlaying(), { once: true });
    await audio.play();
}

export function useSpeechSynthesis(): UseSpeechSynthesis {
    const [state, setState] = useState<SpeechState>('idle');
    // Track current audio element, fetch abort controller, blob URL, and
    // any in-flight preload so cancel() can tear down either phase
    // (loading, preloading, or playing) without needing state.
    const abortRef = useRef<AbortController | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const blobUrlRef = useRef<string | null>(null);
    const preloadRef = useRef<PreloadEntry | null>(null);

    const clearPreload = useCallback(() => {
        const preload = preloadRef.current;
        if (!preload) return;
        preload.controller.abort();
        if (preload.graceTimer) clearTimeout(preload.graceTimer);
        preloadRef.current = null;
    }, []);

    const cancelInternal = useCallback(() => {
        if (abortRef.current) {
            abortRef.current.abort();
            abortRef.current = null;
        }
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
            audioRef.current = null;
        }
        if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current);
            blobUrlRef.current = null;
        }
    }, []);

    const cancel = useCallback(() => {
        cancelInternal();
        clearPreload();
        setState('idle');
    }, [cancelInternal, clearPreload]);

    const preload = useCallback(
        (text: string) => {
            // De-dupe: same text already preloading → keep it.
            const existing = preloadRef.current;
            if (existing && existing.text === text) return;
            // Different text preloading → abort it, start new.
            clearPreload();

            const controller = new AbortController();
            const responsePromise = fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
                signal: controller.signal,
            });
            // Swallow rejections here so an aborted/failed preload doesn't
            // leak an unhandled promise rejection. `speak()` re-fetches if it
            // adopts a failed preload's promise anyway.
            responsePromise.catch(() => {});

            const graceTimer = setTimeout(() => {
                if (preloadRef.current?.controller === controller) {
                    clearPreload();
                }
            }, PRELOAD_GRACE_MS);

            preloadRef.current = { text, controller, responsePromise, graceTimer };
        },
        [clearPreload],
    );

    const speak = useCallback(
        (text: string, _lang: SpeechLang) => {
            // Cancel whatever is playing first — global single-utterance rule.
            cancelInternal();

            // Adopt matching preload if any; otherwise start a fresh fetch.
            let controller: AbortController;
            let responsePromise: Promise<Response>;
            const inflight = preloadRef.current;
            if (inflight && inflight.text === text) {
                controller = inflight.controller;
                responsePromise = inflight.responsePromise;
                if (inflight.graceTimer) clearTimeout(inflight.graceTimer);
                preloadRef.current = null;
            } else {
                clearPreload();
                controller = new AbortController();
                responsePromise = fetch('/api/tts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text }),
                    signal: controller.signal,
                });
            }
            abortRef.current = controller;
            setState('loading');

            (async () => {
                try {
                    const response = await responsePromise;
                    if (!response.ok) {
                        const message = await response.text().catch(() => 'TTS request failed');
                        throw new Error(message);
                    }

                    const onPlaying = () => setState('speaking');
                    const useMse = canUseMediaSource();
                    if (useMse) {
                        await playViaMediaSource(response, audioRef, blobUrlRef, onPlaying);
                    } else {
                        await playViaBlob(response, audioRef, blobUrlRef, onPlaying);
                    }

                    const audio = audioRef.current;
                    if (audio) {
                        audio.addEventListener(
                            'ended',
                            () => {
                                if (blobUrlRef.current) {
                                    URL.revokeObjectURL(blobUrlRef.current);
                                    blobUrlRef.current = null;
                                }
                                audioRef.current = null;
                                setState('idle');
                            },
                            { once: true },
                        );
                        audio.addEventListener(
                            'error',
                            () => {
                                if (blobUrlRef.current) {
                                    URL.revokeObjectURL(blobUrlRef.current);
                                    blobUrlRef.current = null;
                                }
                                audioRef.current = null;
                                setState('idle');
                            },
                            { once: true },
                        );
                    }
                } catch (err) {
                    if ((err as { name?: string }).name === 'AbortError') {
                        // Cancelled intentionally — state is already set by cancel().
                        return;
                    }
                    abortRef.current = null;
                    setState('idle');
                    // Re-throw so SpeakButton's try/catch can show a toast.
                    throw err;
                }
            })();
        },
        [cancelInternal, clearPreload],
    );

    return { supported: true, state, speak, preload, cancel };
}
