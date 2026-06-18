// Type declarations for the JSONB payloads stored on chat-message variant
// tables. The shapes are defined here (not in `schema.ts`) so persistence
// stays a transport-free concern: drizzle types the columns as `unknown`,
// the mapper casts to these once on read, and producers build values that
// satisfy them on write. No runtime validation — every writer is in this
// codebase, so a malformed row is a code bug, not user input.
//
// The `kind` strings deliberately match the GraphQL union member suffixes
// (`Date`, `DateTime`, `SingleSelect`, ...) so the mapper can map kind →
// `__typename` mechanically.

interface ChatAssistantInputSlotShared {
    inputId: string;
    prompt: string;
}

export type ChatAssistantInputSlot =
    | (ChatAssistantInputSlotShared & { kind: 'Date' })
    | (ChatAssistantInputSlotShared & { kind: 'DateRange' })
    | (ChatAssistantInputSlotShared & { kind: 'DateTime' })
    | (ChatAssistantInputSlotShared & { kind: 'Time' })
    | (ChatAssistantInputSlotShared & { kind: 'SingleSelect'; options: string[] })
    | (ChatAssistantInputSlotShared & { kind: 'MultiSelect'; options: string[] })
    | (ChatAssistantInputSlotShared & { kind: 'Boolean' })
    | (ChatAssistantInputSlotShared & { kind: 'Text' });

// Answer values mirror the `ChatAssistantInputValue` GraphQL union. Date /
// DateTime values are stored as ISO strings; the mapper passes Date-shaped
// strings through and constructs `Date` objects for DateTime scalars.
// `DateRange` stores both endpoints as `YYYY-MM-DD`, same convention as `Date`.
export type ChatAssistantInputValue =
    | { kind: 'Date'; date: string }
    | { kind: 'DateRange'; from: string; to: string }
    | { kind: 'DateTime'; dateTime: string }
    | { kind: 'Time'; time: string }
    | { kind: 'String'; value: string }
    | { kind: 'StringList'; values: string[] }
    | { kind: 'Boolean'; value: boolean };

export interface ChatMessageUserInputAnswer {
    inputId: string;
    value: ChatAssistantInputValue;
}
