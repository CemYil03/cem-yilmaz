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
// The public interface exposes a real transport — `speak` starts from
// position 0, `pause` and `resume` toggle without losing position, `stop`
// hard-cancels. `preload(text)` is wired to `SpeakButton`'s onMouseEnter /
// onFocus so the fetch is already in flight by the time the user clicks.
// If the next `speak()` is called with the same text, the preload's
// in-flight response is adopted verbatim (no extra request).
//
// Global single-utterance semantics: `speak()` calls `stop()` first, so
// two messages can never overlap across the app — even one that is
// paused elsewhere gets hard-stopped when a new one starts.

type SpeechLang = 'de-DE' | 'en-US';
type SpeechState = 'idle' | 'loading' | 'playing' | 'paused';

export interface UseSpeechSynthesis {
    // Always true — capability is server-side and unconditionally available.
    supported: true;
    state: SpeechState;
    speak: (text: string, lang: SpeechLang) => void;
    pause: () => void;
    resume: () => void;
    stop: () => void;
    preload: (text: string) => void;
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

// Wire the shared `playing` / `pause` listeners onto a fresh
// `HTMLAudioElement`. Both playback paths (MSE and blob) reach for this so
// a native pause (media keys, mediaSession, headphone unplug) syncs state
// exactly the same way as an in-app pause button click.
//
// We deliberately do NOT listen to `play` — that event fires the moment
// `.play()` is called, before any decoded audio has been produced. The
// button would flip to `[⏸]` while there is still nothing audible. The
// `playing` event fires when the browser actually starts producing
// output, which is the transition we care about.
function wireTransportListeners(audio: HTMLAudioElement, onStateChange: (next: 'playing' | 'paused') => void): void {
    audio.addEventListener('playing', () => onStateChange('playing'));
    audio.addEventListener('pause', () => onStateChange('paused'));
}

async function playViaMediaSource(
    response: Response,
    audioRef: React.MutableRefObject<HTMLAudioElement | null>,
    blobUrlRef: React.MutableRefObject<string | null>,
    onStateChange: (next: 'playing' | 'paused') => void,
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

    wireTransportListeners(audio, onStateChange);

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
    onStateChange: (next: 'playing' | 'paused') => void,
): Promise<void> {
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    blobUrlRef.current = url;

    const audio = new Audio(url);
    audioRef.current = audio;
    wireTransportListeners(audio, onStateChange);
    await audio.play();
}

export function useSpeechSynthesis(): UseSpeechSynthesis {
    const [state, setState] = useState<SpeechState>('idle');
    // Track current audio element, fetch abort controller, blob URL, and
    // any in-flight preload so stop() can tear down either phase
    // (loading, preloading, or playing) without needing state.
    const abortRef = useRef<AbortController | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const blobUrlRef = useRef<string | null>(null);
    const preloadRef = useRef<PreloadEntry | null>(null);
    // Track whether the user asked for a stop, so the native `pause` event
    // fired by `stopInternal()`'s `audio.pause()` call doesn't flip us
    // into the `paused` state instead of `idle`.
    const stoppingRef = useRef(false);

    const clearPreload = useCallback(() => {
        const preload = preloadRef.current;
        if (!preload) return;
        preload.controller.abort();
        if (preload.graceTimer) clearTimeout(preload.graceTimer);
        preloadRef.current = null;
    }, []);

    const stopInternal = useCallback(() => {
        stoppingRef.current = true;
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
        stoppingRef.current = false;
    }, []);

    const stop = useCallback(() => {
        stopInternal();
        clearPreload();
        setState('idle');
    }, [stopInternal, clearPreload]);

    const pause = useCallback(() => {
        if (!audioRef.current) return;
        audioRef.current.pause();
        // The `pause` listener wired in the helpers will also fire and
        // set state to `paused` — this direct set keeps state in sync
        // even in the (unlikely) case listeners haven't attached yet.
        setState('paused');
    }, []);

    const resume = useCallback(() => {
        if (!audioRef.current) return;
        void audioRef.current.play().catch(() => {
            // If the browser refuses (rare — resume follows a user
            // gesture), the `pause` listener will keep the state at
            // `paused` and the user can retry.
        });
        setState('playing');
    }, []);

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
            // Hard-stop whatever is playing / paused first — global
            // single-utterance rule.
            stopInternal();

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

            // Callback the helpers use to sync state on native
            // pause/resume events. Ignored while `stopInternal` is running
            // — that path is tearing the audio down and drives state to
            // `idle` explicitly.
            const onStateChange = (next: 'playing' | 'paused') => {
                if (stoppingRef.current) return;
                setState(next);
            };

            (async () => {
                try {
                    const response = await responsePromise;
                    if (!response.ok) {
                        const message = await response.text().catch(() => 'TTS request failed');
                        throw new Error(message);
                    }

                    const useMse = canUseMediaSource();
                    if (useMse) {
                        await playViaMediaSource(response, audioRef, blobUrlRef, onStateChange);
                    } else {
                        await playViaBlob(response, audioRef, blobUrlRef, onStateChange);
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
                        // Cancelled intentionally — state is already set by stop().
                        return;
                    }
                    abortRef.current = null;
                    setState('idle');
                    // Re-throw so SpeakButton's try/catch can show a toast.
                    throw err;
                }
            })();
        },
        [stopInternal, clearPreload],
    );

    return { supported: true, state, speak, pause, resume, stop, preload };
}
