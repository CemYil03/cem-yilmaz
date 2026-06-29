import type { GoogleLanguageModelOptions } from '@ai-sdk/google';

// Shared Gemini provider options for every chat agent in this directory. The
// two values matter independently and we always want both:
//
// - `thinkingConfig.thinkingBudget: 0` — disables thinking. Without it,
//   Gemini 2.5 Flash periodically emits Python-style tool calls instead of
//   JSON, which the AI SDK rejects as `MALFORMED_FUNCTION_CALL`. See
//   https://github.com/googleapis/python-genai/issues/2081.
// - `structuredOutputs: true` — constrained decoding so tool calls are valid
//   JSON matching the declared schema. Without it Gemini freely invents field
//   names (e.g. `input_type: "DATE"` with `name`/`label`) instead of using
//   the schema's `kind` discriminator. Pairs with the deliberately flat (not
//   `discriminatedUnion`) shape in `toolPromptUserForInput.ts`.
//
// Kept as a single exported constant rather than a base class — each agent
// file stays self-contained and skimmable per
// `docs/architecture/multi-agent-chat.md`. Add fields here only when *every*
// agent wants them; per-agent variants stay inline.
export const googleAgentProviderOptions = {
    google: {
        thinkingConfig: { thinkingBudget: 0 },
        structuredOutputs: true,
    } satisfies GoogleLanguageModelOptions,
};

// Today's date in `YYYY-MM-DD`, rendered as the line every chat agent embeds
// near the top of its system prompt. Without this, Gemini answers
// "what day is it?" with a year-old training-cutoff date and reasons about
// deadlines (project timelines, OTP expiry, "due next Friday") as if today
// were that cutoff. Read at agent-construction time — every user turn builds
// a fresh `ToolLoopAgent`, so the value tracks the calendar without a
// long-lived cache.
export function currentDateForAgent(): string {
    return `Today's date is ${new Date().toISOString().slice(0, 10)}.`;
}
