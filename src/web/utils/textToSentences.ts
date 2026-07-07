// Split a plain-text string into speak-sized chunks so the first Gemini
// synthesis call can start almost immediately instead of waiting for the
// whole message.
//
// Two-pass algorithm:
//   1. Split on sentence terminators (.!?…) followed by whitespace.
//   2. Emit the FIRST sentence (up to a hard char cap) as its own chunk
//      so audio starts flowing after ~1 Gemini call. Then greedily
//      coalesce the remainder into ~TARGET-length blocks so subsequent
//      calls still have enough prosodic context.
//
// A dependency-free regex pass matches `markdownToPlainText.ts`'s stance;
// natural-language sentence splitting is not a solved problem in general
// but the assistant's own prose is well-behaved.

const TARGET_CHUNK_LENGTH = 300;
// The first chunk gets a small cap so first-audio latency is bounded by a
// short synthesis call, not by "at least one sentence of prose". If the
// natural first sentence is longer than this, we split it at the last
// word boundary before the cap — Gemini still speaks a coherent phrase,
// and the second chunk starts synthesizing while the first one plays.
const FIRST_CHUNK_MAX_LENGTH = 80;

export function textToSentences(input: string): string[] {
    const trimmed = input.trim();
    if (!trimmed) return [];

    // Split on `.!?…` optionally followed by closing quotes/brackets, then
    // whitespace. Lookbehind keeps the terminator with the preceding
    // sentence so we can rejoin exactly.
    const parts = trimmed.split(/(?<=[.!?…][)"'”’\]]?)\s+/);
    if (parts.length === 0) return [trimmed];

    const chunks: string[] = [];

    // First chunk — as small as possible for fast first-audio.
    const firstSentence = parts.shift() as string;
    if (firstSentence.length <= FIRST_CHUNK_MAX_LENGTH) {
        chunks.push(firstSentence);
    } else {
        // Split at the last word boundary before the cap. The remainder
        // is prepended to the next-chunk buffer so no words are lost.
        const cut = firstSentence.lastIndexOf(' ', FIRST_CHUNK_MAX_LENGTH);
        const splitAt = cut > 0 ? cut : FIRST_CHUNK_MAX_LENGTH;
        chunks.push(firstSentence.slice(0, splitAt));
        parts.unshift(firstSentence.slice(splitAt).trimStart());
    }

    // Remaining chunks — coalesce up to TARGET for prosody.
    let buffer = '';
    for (const part of parts) {
        if (!buffer) {
            buffer = part;
            continue;
        }
        if (buffer.length + 1 + part.length <= TARGET_CHUNK_LENGTH) {
            buffer = `${buffer} ${part}`;
        } else {
            chunks.push(buffer);
            buffer = part;
        }
    }
    if (buffer) chunks.push(buffer);

    return chunks;
}
