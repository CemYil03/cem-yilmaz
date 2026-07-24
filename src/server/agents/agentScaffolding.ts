import type { GoogleLanguageModelOptions } from '@ai-sdk/google';

// Shared Gemini provider options for every chat agent in this directory.
// Two knobs matter independently:
//
// - `thinkingConfig` — three postures:
//   - **gemini-3.6-flash** (`thinkingLevel: 'high'` + `includeThoughts`):
//     replaces the old 2.5 Pro mid-tier. High reasoning + thought summaries
//     (streamed as `reasoning-delta`, persisted on
//     `ChatMessageAssistantText.reasoning`).
//   - **Other Flash** (`thinkingBudget: 0`): disables thinking. Without it,
//     Gemini 2.5 Flash periodically emits Python-style tool calls instead of
//     JSON, which the AI SDK rejects as `MALFORMED_FUNCTION_CALL`. See
//     https://github.com/googleapis/python-genai/issues/2081. Substring match
//     on `flash` keeps a future `gemini-*-flash-lite` on this path.
//   - **Pro** (`includeThoughts: true`): Pro rejects `thinkingBudget: 0`
//     ("Budget 0 is invalid. This model only works in thinking mode.") and
//     keeps the provider default budget.
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
    if (modelId === 'gemini-3.6-flash') {
        google.thinkingConfig = { thinkingLevel: 'high', includeThoughts: true };
    } else if (modelId.includes('flash')) {
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

// Shared field copy for every `delegateTo*` `brief` input. Selection detail
// lives on each tool's `description`; this only teaches how to fill the brief.
export const DELEGATE_BRIEF_DESCRIBE =
    "User request plus any ids/dates already collected. Sub-agent has a live snapshot — don't summarize it.";

// Shared language / concision / id / sentinel rules for every domain mutation
// sub-agent. Domain-specific workflows stay in each agent file; this block is
// the wire contract with the orchestrator (see agent-delegation.md).
export function subAgentClosingRules(opts: { domainLabel: string; outOfDomainExample: string }): string[] {
    return [
        '- Reply in the language the user wrote in (German or English).',
        '- Be concise: your final text becomes the orchestrator narration. One or two sentences. Name ids of rows Cem may want to open.',
        "- Never invent an id. Use ids from the snapshot or from a prior tool result's `referenceIds` (in input order).",
        '- If required info is missing, return EXACTLY this JSON as your final text (no fence, no prose):',
        '  {"status":"needsMoreInfo","missingFields":["..."],"summary":"..."}',
        `- If outside ${opts.domainLabel} (e.g. '${opts.outOfDomainExample}'), return the same JSON with status \`noOp\` and empty \`missingFields\`.`,
    ];
}
