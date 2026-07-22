import type { ChatAssistantInputSlot, ChatAssistantInputValue, ChatMessageUserInputAnswer } from '../db/chatPayloadTypes';
import type {
    FileUpload,
    ChatMessage,
    ChatMessageAssistantInputCollection,
    ChatMessageAssistantText,
    ChatMessageToolApprovalRequest,
    ChatMessageToolApprovalResponse,
    ChatMessageToolCall,
    ChatMessageUser,
    ChatMessageUserInput,
    CompassObservation,
    User,
} from '../db/schema';
import type {
    GqlSChatAssistantInput,
    GqlSChatAssistantInputValue,
    GqlSChatMessageGeneration,
    GqlSChatMessage,
    GqlSChatMessageUserInputAnswer,
} from '../graphql/generated';
import { toGqlCompassObservation } from './toGqlCompassObservation';
import { toGqlUser } from './toGqlUser';
import { toGqlFileUpload } from './toGqlFileUpload';

// Server-rooted URL the bytes are streamed back from. Centralized so the
// mapper, the upload route, and the download route agree on the path. Path
// only — same-origin — so the cookie auth the rest of the app uses applies
// without any cross-origin handling.
//
// `toGqlFileUpload` lives in `./toGqlFileUpload` and is shared with the
// project resources mapper.

// Joined view of one persisted chat message: the spine row plus whichever
// variant-table row matches its `kind`, plus the author user when the variant
// requires it. Loaded by the read query in a single grouped fetch — see
// `chatFindOne`.
export interface ChatMessageRowJoined {
    spine: ChatMessage;
    author?: User | null;
    user?: ChatMessageUser;
    // Attachments folded onto the user variant. Bulk-loaded after the main
    // join — see `chatMessageRowsLoad` and `chatMessageRowLoad`. Empty array
    // when the user message had none. The full row (including raw bytes) is
    // carried so `toModelMessages` can inline `FilePart` / `ImagePart` data
    // without a second DB hop.
    userAttachments?: FileUpload[];
    // Active (non-dismissed) compass observations the analyzer extracted from
    // this user message. Populated by `attachCompassObservations` on the read
    // path for admin chats; left as `undefined` for visitor messages.
    compassObservations?: CompassObservation[];
    assistantText?: ChatMessageAssistantText;
    toolCall?: ChatMessageToolCall;
    toolApprovalRequest?: ChatMessageToolApprovalRequest;
    toolApprovalResponse?: ChatMessageToolApprovalResponse;
    assistantInputCollection?: ChatMessageAssistantInputCollection;
    userInput?: ChatMessageUserInput;
}

// Variant-row presence is enforced by the spine's `kind` column at write time;
// at read time a `null` here is data corruption, not user input. One helper
// keeps every case in `toGqlChatMessage` to a single line.
function need<T>(value: T | null | undefined, spine: ChatMessage, label: string): T {
    if (value == null) throw new Error(`ChatMessage ${spine.chatMessageId}: missing ${label} variant`);
    return value;
}

export function toGqlChatMessage(row: ChatMessageRowJoined): GqlSChatMessage {
    const { spine } = row;
    switch (spine.kind) {
        case 'user': {
            const variant = need(row.user, spine, 'user');
            // Author is nullable for anonymous visitor messages (no `User`
            // row at all). Admin chats always have a logged-in author so
            // the null branch fires only for visitor traffic.
            return {
                gqlTypeName: 'ChatMessageUser',
                chatMessageId: spine.chatMessageId,
                author: row.author ? toGqlUser(row.author) : null,
                body: variant.body,
                // Attachments are an empty array on legacy rows / messages
                // without files. The bulk loader in `chatMessageRowsLoad`
                // always populates `userAttachments` for user rows; we still
                // tolerate `undefined` to keep the mapper safe to call
                // standalone (e.g. tests that build a row by hand).
                attachments: (row.userAttachments ?? []).map(toGqlFileUpload),
                // Bulk-loaded on the read path for admin chats — see
                // `attachCompassObservations` in `chatMessageRowsLoad`. Empty
                // on visitor messages (the analyzer never runs there) and
                // on admin messages that haven't been analyzed yet or had no
                // observations recorded.
                compassObservations: (row.compassObservations ?? []).map((o) => toGqlCompassObservation(o, spine.chatId)),
                createdAt: spine.createdAt,
            };
        }
        case 'assistantText': {
            const variant = need(row.assistantText, spine, 'assistantText');
            return {
                gqlTypeName: 'ChatMessageAssistantText',
                chatMessageId: spine.chatMessageId,
                body: variant.body,
                reasoning: variant.reasoning ?? null,
                generation: toGqlChatMessageGeneration(variant),
                createdAt: spine.createdAt,
            };
        }
        case 'toolCall': {
            const variant = need(row.toolCall, spine, 'toolCall');
            return {
                gqlTypeName: 'ChatMessageToolCall',
                chatMessageId: spine.chatMessageId,
                toolName: variant.toolName,
                // `toolArgs` is JSONB (unknown shape per tool); the GraphQL
                // `JSON` scalar passes it through verbatim.
                args: variant.toolArgs,
                // The tool's return value, JSONB — passed through verbatim like
                // `args`. Null for void tools or a call still in flight. See
                // docs/styles/chat.md for how the UI reads it.
                toolResult: variant.toolResult,
                // Children of a sub-agent delegation point at the delegate
                // row; top-level orchestrator tool calls are null. See
                // `docs/architecture/agent-delegation.md` ("Nested tool calls").
                parentChatMessageId: spine.parentChatMessageId,
                generation: toGqlChatMessageGeneration(variant),
                createdAt: spine.createdAt,
            };
        }
        case 'toolApprovalRequest': {
            const variant = need(row.toolApprovalRequest, spine, 'toolApprovalRequest');
            return {
                gqlTypeName: 'ChatMessageToolApprovalRequest',
                chatMessageId: spine.chatMessageId,
                approvalId: variant.approvalId,
                toolName: variant.toolName,
                args: variant.toolArgs,
                generation: toGqlChatMessageGeneration(variant),
                createdAt: spine.createdAt,
            };
        }
        case 'toolApprovalResponse': {
            const variant = need(row.toolApprovalResponse, spine, 'toolApprovalResponse');
            return {
                gqlTypeName: 'ChatMessageToolApprovalResponse',
                chatMessageId: spine.chatMessageId,
                approvalId: variant.approvalId,
                approved: variant.approved,
                reason: variant.reason,
                createdAt: spine.createdAt,
            };
        }
        case 'assistantInputCollection': {
            const variant = need(row.assistantInputCollection, spine, 'assistantInputCollection');
            const rawSlots = variant.inputs as unknown[];
            // Pre-fix rows (or any future malformed write) may carry slots
            // whose `kind` isn't one of the known discriminator values. Drop
            // them rather than letting the GraphQL resolver explode on a
            // null member of the non-nullable `inputs` array.
            const slots = rawSlots.filter(isChatAssistantInputSlot);
            return {
                gqlTypeName: 'ChatMessageAssistantInputCollection',
                chatMessageId: spine.chatMessageId,
                prompt: variant.prompt,
                inputs: slots.map(toGqlChatAssistantInput),
                // Pre-`mode` rows are migrated to `'form'` by the column
                // default; the `?? 'form'` guard is paranoia for any future
                // hand-written row that omits it.
                mode: variant.mode === 'stepThrough' ? 'StepThrough' : 'Form',
                generation: toGqlChatMessageGeneration(variant),
                createdAt: spine.createdAt,
            };
        }
        case 'userInput': {
            const variant = need(row.userInput, spine, 'userInput');
            const answers = variant.answers as ChatMessageUserInputAnswer[];
            return {
                gqlTypeName: 'ChatMessageUserInput',
                chatMessageId: spine.chatMessageId,
                // Same nullable-author rationale as the `user` case above —
                // anonymous visitors also submit answers to assistant input
                // collections.
                author: row.author ? toGqlUser(row.author) : null,
                collectionMessageId: variant.collectionMessageId,
                answers: answers.map(toGqlChatMessageUserInputAnswer),
                createdAt: spine.createdAt,
            };
        }
    }
}

function toGqlChatAssistantInput(slot: ChatAssistantInputSlot): GqlSChatAssistantInput {
    const shared = { inputId: slot.inputId, prompt: slot.prompt };
    switch (slot.kind) {
        case 'Date':
            return { gqlTypeName: 'ChatAssistantInputDate', ...shared };
        case 'DateRange':
            return { gqlTypeName: 'ChatAssistantInputDateRange', ...shared };
        case 'DateTime':
            return { gqlTypeName: 'ChatAssistantInputDateTime', ...shared };
        case 'Time':
            return { gqlTypeName: 'ChatAssistantInputTime', ...shared };
        case 'SingleSelect':
            return { gqlTypeName: 'ChatAssistantInputSingleSelect', ...shared, options: slot.options };
        case 'MultiSelect':
            return { gqlTypeName: 'ChatAssistantInputMultiSelect', ...shared, options: slot.options };
        case 'Boolean':
            return { gqlTypeName: 'ChatAssistantInputBoolean', ...shared };
        case 'Text':
            return { gqlTypeName: 'ChatAssistantInputText', ...shared };
        case 'Otp':
            return { gqlTypeName: 'ChatAssistantInputOtp', ...shared };
    }
}

const SLOT_KINDS_WITH_OPTIONS = new Set(['SingleSelect', 'MultiSelect']);
const SLOT_KINDS_WITHOUT_OPTIONS = new Set(['Date', 'DateRange', 'DateTime', 'Time', 'Boolean', 'Text', 'Otp']);

// Defensive guard for the JSONB `inputs` payload — drops any row written
// before validation existed (or by a future bug) so the GraphQL resolver
// doesn't see `undefined` in the non-nullable `inputs` array. Legacy rows
// that carry an extra `required` boolean (the field has since been dropped)
// still pass — extra keys are ignored.
function isChatAssistantInputSlot(value: unknown): value is ChatAssistantInputSlot {
    if (typeof value !== 'object' || value === null) return false;
    const candidate = value as { kind?: unknown; inputId?: unknown; prompt?: unknown; options?: unknown };
    if (typeof candidate.inputId !== 'string') return false;
    if (typeof candidate.prompt !== 'string') return false;
    if (typeof candidate.kind !== 'string') return false;
    if (SLOT_KINDS_WITHOUT_OPTIONS.has(candidate.kind)) return true;
    if (SLOT_KINDS_WITH_OPTIONS.has(candidate.kind)) {
        return Array.isArray(candidate.options) && candidate.options.every((o) => typeof o === 'string');
    }
    return false;
}

function toGqlChatMessageUserInputAnswer(answer: ChatMessageUserInputAnswer): GqlSChatMessageUserInputAnswer {
    return {
        inputId: answer.inputId,
        value: toGqlChatAssistantInputValue(answer.value),
    };
}

function toGqlChatAssistantInputValue(value: ChatAssistantInputValue): GqlSChatAssistantInputValue {
    switch (value.kind) {
        case 'Date':
            // Tolerate legacy rows that stored a full ISO-8601 timestamp instead
            // of `YYYY-MM-DD` — `DateResolver.serialize` rejects the former,
            // but we still want those chats to load.
            return { gqlTypeName: 'ChatAssistantInputValueDate', date: persistedDateToIsoDate(value.date) };
        case 'DateRange':
            return {
                gqlTypeName: 'ChatAssistantInputValueDateRange',
                from: persistedDateToIsoDate(value.from),
                to: persistedDateToIsoDate(value.to),
            };
        case 'DateTime':
            return { gqlTypeName: 'ChatAssistantInputValueDateTime', dateTime: new Date(value.dateTime) };
        case 'Time':
            return { gqlTypeName: 'ChatAssistantInputValueTime', time: value.time };
        case 'String':
            return { gqlTypeName: 'ChatAssistantInputValueString', value: value.value };
        case 'StringList':
            return { gqlTypeName: 'ChatAssistantInputValueStringList', values: value.values };
        case 'Boolean':
            return { gqlTypeName: 'ChatAssistantInputValueBoolean', boolean: value.value };
    }
}

// Older rows persisted by `chatInputCollectionRespond` before the Date-scalar
// normalization fix may contain full ISO-8601 timestamps (`2026-06-10T00:00:00.000Z`)
// for `Date`-kind values. `DateResolver.serialize` only accepts a JS `Date` or
// a `YYYY-MM-DD` string, so we trim down to the date portion here. New rows
// already store the canonical form; this is just a forward-compatible guard.
function persistedDateToIsoDate(value: string): string {
    if (value.length > 10 && value.includes('T')) return value.slice(0, 10);
    return value;
}

// Variant-row generation snapshot → GraphQL. Returns `null` when the row
// predates the feature (no `modelId`); the field on every parent variant is
// nullable for exactly that reason. The four AI-produced variant tables
// share the same six columns, so a structural input type keeps this helper
// usable from each case without a per-table overload.
function toGqlChatMessageGeneration(variant: {
    modelId: string | null;
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
    reasoningTokens: number | null;
    cachedInputTokens: number | null;
}): GqlSChatMessageGeneration | null {
    if (!variant.modelId) return null;
    return {
        modelId: variant.modelId,
        inputTokens: variant.inputTokens,
        outputTokens: variant.outputTokens,
        totalTokens: variant.totalTokens,
        reasoningTokens: variant.reasoningTokens,
        cachedInputTokens: variant.cachedInputTokens,
    };
}
