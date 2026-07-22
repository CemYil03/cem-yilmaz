import type { GoogleLanguageModelOptions } from '@ai-sdk/google';

// Shared Gemini provider options for every chat agent in this directory.
// Two knobs matter independently:
//
// - `thinkingConfig` — Flash vs Pro diverge:
//   - **Flash** (`thinkingBudget: 0`): disables thinking. Without it, Gemini
//     2.5 Flash periodically emits Python-style tool calls instead of JSON,
//     which the AI SDK rejects as `MALFORMED_FUNCTION_CALL`. See
//     https://github.com/googleapis/python-genai/issues/2081.
//   - **Pro** (`includeThoughts: true`): Pro rejects `thinkingBudget: 0`
//     ("Budget 0 is invalid. This model only works in thinking mode.") and
//     keeps the provider default budget. `includeThoughts` asks Gemini for
//     thought *summaries*, which the AI SDK surfaces as `reasoning-delta`
//     stream parts; `chatAssistantTurnRun` publishes them as
//     `ChatUpdateAssistantReasoningChunk` and persists the concatenated
//     summary on `ChatMessageAssistantText.reasoning`. Substring match on
//     `flash` is deliberate so a future `gemini-3.5-flash-lite` still
//     disables thinking.
// - `structuredOutputs: true` — constrained decoding so tool calls are valid
//   JSON matching the declared schema. Without it Gemini freely invents field
//   names (e.g. `input_type: "DATE"` with `name`/`label`) instead of using
//   the schema's `kind` discriminator. Pairs with the deliberately flat (not
//   `discriminatedUnion`) shape in `toolPromptUserForInput.ts`. Always on.
//
// Kept as a single exported function rather than a base class — each agent
// file stays self-contained and skimmable per
// `docs/architecture/chat.md`. Add fields here only when *every*
// agent wants them; per-agent variants stay inline.
export function googleAgentProviderOptionsFor(modelId: string): { google: GoogleLanguageModelOptions } {
    const google: GoogleLanguageModelOptions = { structuredOutputs: true };
    if (modelId.includes('flash')) {
        google.thinkingConfig = { thinkingBudget: 0 };
    } else {
        google.thinkingConfig = { includeThoughts: true };
    }
    return { google };
}

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
