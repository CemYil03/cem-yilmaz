import { useCallback, useRef, useState } from 'react';

// TTS via Gemini — POSTs cleaned text to `/api/tts` and plays the returned
// audio with `new Audio()`. Neural-quality output regardless of OS or browser.
// The public interface is identical to the previous Web Speech API hook so
// `SpeakButton` (and any future caller) requires no changes except the added
// `'loading'` state for the API-call window.
//
// Global single-utterance semantics are preserved: `speak()` cancels any
// in-flight request or playing audio before starting a new one, so two
// messages can never overlap across the app.

type SpeechLang = 'de-DE' | 'en-US';
type SpeechState = 'idle' | 'loading' | 'speaking';

export interface UseSpeechSynthesis {
    // Always true — capability is server-side and unconditionally available.
    supported: true;
    state: SpeechState;
    speak: (text: string, lang: SpeechLang) => void;
    cancel: () => void;
}

export function useSpeechSynthesis(): UseSpeechSynthesis {
    const [state, setState] = useState<SpeechState>('idle');
    // Track current audio element and fetch abort controller so cancel() can
    // tear down either phase (loading or speaking) without needing state.
    const abortRef = useRef<AbortController | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const blobUrlRef = useRef<string | null>(null);

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
        setState('idle');
    }, [cancelInternal]);

    const speak = useCallback(
        (text: string, _lang: SpeechLang) => {
            // Cancel whatever is playing or loading first — global single-utterance rule.
            cancelInternal();
            setState('loading');

            const controller = new AbortController();
            abortRef.current = controller;

            (async () => {
                try {
                    const response = await fetch('/api/tts', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text }),
                        signal: controller.signal,
                    });

                    if (!response.ok) {
                        const message = await response.text().catch(() => 'TTS request failed');
                        throw new Error(message);
                    }

                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    blobUrlRef.current = url;

                    const audio = new Audio(url);
                    audioRef.current = audio;

                    audio.onended = () => {
                        URL.revokeObjectURL(url);
                        blobUrlRef.current = null;
                        audioRef.current = null;
                        setState('idle');
                    };
                    audio.onerror = () => {
                        URL.revokeObjectURL(url);
                        blobUrlRef.current = null;
                        audioRef.current = null;
                        setState('idle');
                    };

                    setState('speaking');
                    await audio.play();
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
        [cancelInternal],
    );

    return { supported: true, state, speak, cancel };
}
