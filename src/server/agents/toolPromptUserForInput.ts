import { tool } from 'ai';
import { z } from 'zod';

// --- toolPromptUserForInput --------------------------------------------------
//
// Lets an assistant prompt the user for one or more structured values in a
// single chat turn. The slot kinds mirror the `ChatAssistantInput` GraphQL
// union members (`Date`, `DateTime`, ..., `Boolean`, `Text`).
//
// The top-level `mode` field controls rendering only — `form` shows every slot
// at once, `stepThrough` walks the user through one slot at a time. The
// submitted answer set is identical between modes; the wizard accumulates
// drafts client-side and submits the same batch the form does.
//
// No `execute`: the tool call itself — with its structured input — is what
// gets persisted. `chatAssistantTurnRun` recognizes the tool name, validates
// the input with `chatAssistantInputCollectionInputSchema`, and writes a
// `chatMessagesAssistantInputCollection` row (assigning each slot a fresh
// `inputId`) instead of a generic tool-call row, so the UI renders the form
// directly. The agent loop is also configured to stop on this tool call —
// see `agentUserConversation.stopWhen` — because the next turn-taker is the
// human, not the LLM.
//
// Schema shape: a flat object per slot with a `kind` enum, NOT a Zod
// `discriminatedUnion`. Discriminated unions compile to JSON Schema `oneOf`,
// which Gemini's tool-call schema renderer handles poorly — when faced with
// it, the model tends to invent its own field names (e.g. `input_type: DATE`
// with `name`/`label`) and ignore the schema entirely. A flat enum + optional
// `options` is the Gemini-friendly form; conditional shape (options required
// only for selects) is enforced at validation time, not in the wire schema.
//
// Reused across agents — keep agent-specific behavior out of here.

const SLOT_KINDS = ['Date', 'DateRange', 'DateTime', 'Time', 'SingleSelect', 'MultiSelect', 'Boolean', 'Text'] as const;

const COLLECTION_MODES = ['form', 'stepThrough'] as const;

const inputSlotSchema = z
    .object({
        kind: z
            .enum(SLOT_KINDS)
            .describe(
                [
                    'Type of value to collect. Must be one of:',
                    '`Date` (single calendar day),',
                    '`DateRange` (calendar range with required start and end days),',
                    '`DateTime` (single instant),',
                    '`Time` (clock time, no date),',
                    '`SingleSelect` (pick exactly one of `options`),',
                    '`MultiSelect` (pick zero or more of `options`),',
                    '`Boolean` (yes/no answer, rendered as a Yes/No button pair),',
                    '`Text` (free-form string).',
                ].join(' '),
            ),
        prompt: z.string().describe('Label shown next to this specific input slot.'),
        options: z
            .array(z.string())
            .optional()
            .describe('Choices for `SingleSelect` / `MultiSelect`. Required for those kinds; omit otherwise.'),
    })
    .describe('A single typed slot the user is asked to fill.');

export const chatAssistantInputCollectionInputSchema = z.object({
    prompt: z.string().describe('Framing shown above the form. Sets context for all slots; do not duplicate per-slot prompts here.'),
    inputs: z.array(inputSlotSchema).min(1).describe('1..N typed input slots, rendered top-to-bottom.'),
    mode: z
        .enum(COLLECTION_MODES)
        .default('form')
        .describe(
            [
                'How the form is presented to the user.',
                '`form` (default) renders all slots at once on a single card — good for short, tightly related batches (1–3 slots).',
                '`stepThrough` walks the user through one slot at a time with Next / Skip / Back — better for longer or guided',
                'flows (3+ slots, onboarding-style sequences). Submission semantics are identical: the user always answers the',
                'collection in one round-trip; only the rendering differs.',
            ].join(' '),
        ),
});

export type ChatAssistantInputCollectionInput = z.infer<typeof chatAssistantInputCollectionInputSchema>;

export function toolPromptUserForInput() {
    return tool({
        description: [
            'Ask the user for one or more structured values in a single chat turn.',
            'Use this instead of asking for values in prose whenever the values have a known shape',
            '(dates, time ranges, picking from a list, yes/no, free text, ...).',
            'Group related questions into one call — do not call this tool multiple times in a row',
            'when the questions could be answered together.',
            'Each slot MUST set `kind` to one of the allowed enum values; never invent fields like `name`,',
            '`label`, or `input_type`.',
            'Set `mode` to `stepThrough` when the form has many slots or works best as a guided sequence;',
            'omit it (or set `form`) for short, tightly related batches that fit on one card.',
            'The tool result has the shape `{ status: "answered" | "skipped", answers: [...] }`.',
            'On `status: "skipped"`, the user declined to answer (e.g. they typed a free-text message',
            'instead of filling the form) — drop the question and respond to whatever the user said next.',
            'Do NOT immediately re-ask the same question; either rephrase, ask something different, or',
            'proceed without the missing information.',
        ].join(' '),
        inputSchema: chatAssistantInputCollectionInputSchema,
    });
}
