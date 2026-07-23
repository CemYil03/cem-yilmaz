// Context-window headroom for the workspace assistant composer.
//
// "Used" is the most recent LLM step's `inputTokens` — that number is the
// size of the prompt the provider actually saw (system + history + tools),
// so it is the right denominator against the model's context window. A
// naïve sum across rows would over-count because one step denormalizes the
// same snapshot onto every AI-produced variant it emits (see
// `docs/architecture/chat-persistence.md`).
//
// Walks newest → oldest and returns the first non-null `inputTokens`. Null
// when the chat has no generation metadata yet (fresh chat, or legacy rows
// written before usage persistence). Accepts `unknown[]` because the
// transcript union includes variants without a `generation` field.

export function chatContextTokensUsed(messages: ReadonlyArray<unknown>): number | null {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
        const message = messages[index];
        if (!message || typeof message !== 'object' || !('generation' in message)) continue;
        const inputTokens = (message as { generation?: { inputTokens?: number | null } | null }).generation?.inputTokens;
        if (typeof inputTokens === 'number') return inputTokens;
    }
    return null;
}

/** Compact token count for the composer chip — `850`, `12.4k`, `1M`. */
export function formatTokenCount(tokens: number): string {
    if (tokens < 1_000) return String(tokens);
    if (tokens < 1_000_000) {
        const thousands = tokens / 1_000;
        const text = thousands < 100 ? thousands.toFixed(1) : Math.round(thousands).toString();
        return `${text.replace(/\.0$/, '')}k`;
    }
    const millions = tokens / 1_000_000;
    const text = millions < 10 ? millions.toFixed(1) : Math.round(millions).toString();
    return `${text.replace(/\.0$/, '')}M`;
}
