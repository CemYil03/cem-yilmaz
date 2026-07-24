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
// see `agentVisitor.stopWhen` — because the next turn-taker is the
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

const SLOT_KINDS = ['Date', 'DateRange', 'DateTime', 'Time', 'SingleSelect', 'MultiSelect', 'Boolean', 'Text', 'Otp'] as const;

const COLLECTION_MODES = ['form', 'stepThrough'] as const;

const inputSlotSchema = z
    .object({
        kind: z.enum(SLOT_KINDS).describe('Must be one of the enum values. Use `Otp` only after `submitProjectRequest`.'),
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
        .describe('`form` = all slots at once (default); `stepThrough` = one-at-a-time for longer flows.'),
});

export type ChatAssistantInputCollectionInput = z.infer<typeof chatAssistantInputCollectionInputSchema>;

export function toolPromptUserForInput() {
    return tool({
        description: [
            'Collect one or more typed values in a chat form. Use whenever the value has a known shape (email, date,',
            'yes/no, select, OTP, name) — even for a single field; asking in prose is a bug.',
            'Group tightly related slots in one call; follow up later as needed.',
            'On status "skipped", do not immediately re-ask the same question.',
        ].join(' '),
        inputSchema: chatAssistantInputCollectionInputSchema,
    });
}
