import { createHash } from 'node:crypto';

// SHA-256 hex over `${text}|${voice}|${model}|${format}` — the cache key
// for `TtsAudioCache`. Kept as a tiny standalone helper so the route
// (`src/routes/api/tts.ts`) and any future path (e.g. a client that wants
// to guess whether a preload is already cached) share one definition.
//
// Both `voice` and `model` are part of the key because Gemini output
// differs across either dimension; `format` is here too so a wire-format
// migration (WAV → MP3) never returns the wrong bytes for a stale row.
export function ttsContentHash(input: { text: string; voice: string; model: string; format: string }): string {
    return createHash('sha256').update(`${input.text}|${input.voice}|${input.model}|${input.format}`).digest('hex');
}
