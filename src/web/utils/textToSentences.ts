// Split a plain-text string into speak-sized chunks so the first Gemini
// synthesis call can start almost immediately instead of waiting for the
// whole message.
//
// Two-pass algorithm:
//   1. Split on sentence terminators (.!?…) followed by whitespace.
//   2. Greedily coalesce back into ~TARGET-length blocks so each Gemini
//      call still has enough prosodic context.
//
// A dependency-free regex pass matches `markdownToPlainText.ts`'s stance;
// natural-language sentence splitting is not a solved problem in general
// but the assistant's own prose is well-behaved.

const TARGET_CHUNK_LENGTH = 300;
const MIN_CHUNK_LENGTH = 120;

export function textToSentences(input: string): string[] {
    const trimmed = input.trim();
    if (!trimmed) return [];

    // Split on `.!?…` optionally followed by closing quotes/brackets, then
    // whitespace. Lookbehind keeps the terminator with the preceding
    // sentence so we can rejoin exactly.
    const parts = trimmed.split(/(?<=[.!?…][)"'”’\]]?)\s+/);
    if (parts.length === 0) return [trimmed];

    const chunks: string[] = [];
    let buffer = '';

    for (const part of parts) {
        if (!buffer) {
            buffer = part;
            continue;
        }
        // Coalesce until we're near TARGET; if the next part would push us
        // way past, flush what we have.
        if (buffer.length < MIN_CHUNK_LENGTH || buffer.length + 1 + part.length <= TARGET_CHUNK_LENGTH) {
            buffer = `${buffer} ${part}`;
        } else {
            chunks.push(buffer);
            buffer = part;
        }
    }
    if (buffer) chunks.push(buffer);

    return chunks;
}
