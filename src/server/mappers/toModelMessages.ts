import type { FilePart, ImagePart, JSONValue, ModelMessage, TextPart } from 'ai';
import type { FileUpload } from '../db/schema';
import type { ChatMessageRowJoined } from './toGqlChatMessage';

// This is the only file in the codebase that imports AI SDK transport types.
// See docs/architecture/chat-persistence.md for the rationale: persistence is
// UI-shaped (matches the GraphQL `ChatMessage` union), and this mapper is the
// single boundary that translates persisted rows into the LLM's
// `ModelMessage[]` for replay.

const PROMPT_USER_FOR_INPUT_TOOL_NAME = 'promptUserForInput';

/**
 * Build the `ModelMessage[]` the agent loop replays for a chat. Rows must be
 * passed in insertion order (the spine's `(chatId, createdAt)` index gives
 * exactly that).
 *
 * Mapping rules:
 * - User text → `{ role: 'user', content }`.
 * - Assistant text → `{ role: 'assistant', content }`.
 * - Tool call → assistant message with a tool-call part. If the same row
 *   carries a `toolResult`, a paired `tool` message follows with the result.
 * - Assistant input collection → assistant tool-call for `promptUserForInput`
 *   so the agent sees its own original turn shape.
 * - User input → `tool` message carrying the answers as the tool result.
 * - Tool-approval request → assistant message carrying both a `tool-call` and
 *   a `tool-approval-request` part. The SDK uses this pair to drive the
 *   approval lifecycle: it filters the approval-request out before sending to
 *   the provider, but uses it to map approvalId → toolCallId so a later
 *   approval-response can route to the right call.
 * - Tool-approval response → `tool` message carrying a `tool-approval-response`
 *   part. When this is the last message, the SDK runs the approved tool's
 *   `execute` itself before stepping the LLM. We never call `execute` from
 *   the respond command — see `chatToolApprovalRespond` and
 *   `docs/architecture/chat.md` ("Tool approvals").
 */
export function toModelMessages(rows: ReadonlyArray<ChatMessageRowJoined>): ModelMessage[] {
    const messages: ModelMessage[] = [];

    for (const row of rows) {
        switch (row.spine.kind) {
            case 'user': {
                if (!row.user) continue;
                // No attachments → keep the cheap string-content shape so
                // the prompt stays compact for plain-text turns.
                const attachments = row.userAttachments ?? [];
                if (attachments.length === 0) {
                    messages.push({ role: 'user', content: row.user.body });
                    break;
                }
                // With attachments, the user's content becomes a parts array:
                // body text first (skipped if the user only sent files), then
                // one Image- or FilePart per attachment, inlining the bytes
                // out of the JOINed payload so we don't take a second hop.
                // Image MIME types prefer `ImagePart` (the SDK accepts this
                // as a first-class image regardless of provider); everything
                // else rides through `FilePart` with the persisted media type.
                const parts: Array<TextPart | ImagePart | FilePart> = [];
                if (row.user.body.length > 0) {
                    parts.push({ type: 'text', text: row.user.body });
                }
                for (const attachment of attachments) {
                    parts.push(toModelMessagePartForFileUpload(attachment));
                }
                messages.push({ role: 'user', content: parts });
                break;
            }
            case 'assistantText': {
                if (!row.assistantText) continue;
                messages.push({ role: 'assistant', content: row.assistantText.body });
                break;
            }
            case 'toolCall': {
                if (!row.toolCall) continue;
                messages.push({
                    role: 'assistant',
                    content: [
                        {
                            type: 'tool-call',
                            toolCallId: row.toolCall.toolCallId,
                            toolName: row.toolCall.toolName,
                            input: row.toolCall.toolArgs as JSONValue,
                        },
                    ],
                });
                if (row.toolCall.resultedAt) {
                    messages.push({
                        role: 'tool',
                        content: [
                            {
                                type: 'tool-result',
                                toolCallId: row.toolCall.toolCallId,
                                toolName: row.toolCall.toolName,
                                output: { type: 'json', value: (row.toolCall.toolResult ?? null) as JSONValue },
                            },
                        ],
                    });
                }
                break;
            }
            case 'assistantInputCollection': {
                if (!row.assistantInputCollection) continue;
                // The assistant turn that produced this collection was itself a
                // call to the `promptUserForInput` tool — replay it as such so
                // the LLM sees the same shape it emitted, including the
                // rendering `mode` it picked.
                messages.push({
                    role: 'assistant',
                    content: [
                        {
                            type: 'tool-call',
                            toolCallId: row.spine.chatMessageId,
                            toolName: PROMPT_USER_FOR_INPUT_TOOL_NAME,
                            input: {
                                prompt: row.assistantInputCollection.prompt,
                                inputs: row.assistantInputCollection.inputs as JSONValue,
                                mode: row.assistantInputCollection.mode,
                            },
                        },
                    ],
                });
                break;
            }
            case 'userInput': {
                if (!row.userInput) continue;
                // An empty `answers` array signals the user pivoted away — the
                // synthetic close-out row `chatMessageCreate` writes when a
                // free-text message arrives while a collection is open. See
                // "Pivoting away from an open collection" in
                // `docs/architecture/chat.md`. The tool-result still has to
                // exist (the AI SDK enforces matched tool-call/tool-result
                // pairs), but `status: 'skipped'` tells the LLM to drop the
                // question and pick up whatever the user said next.
                const answers = row.userInput.answers as JSONValue;
                const isSkipped = Array.isArray(answers) && answers.length === 0;
                messages.push({
                    role: 'tool',
                    content: [
                        {
                            type: 'tool-result',
                            toolCallId: row.userInput.collectionMessageId,
                            toolName: PROMPT_USER_FOR_INPUT_TOOL_NAME,
                            output: {
                                type: 'json',
                                value: {
                                    status: isSkipped ? 'skipped' : 'answered',
                                    answers,
                                },
                            },
                        },
                    ],
                });
                break;
            }
            case 'toolApprovalRequest': {
                if (!row.toolApprovalRequest) continue;
                // Pair the original tool-call with its approval-request part
                // in a single assistant message — this is the shape the SDK
                // emits when it suspends the loop, and what its
                // `collectToolApprovals` helper expects on resume to map
                // approvalId → toolCallId.
                messages.push({
                    role: 'assistant',
                    content: [
                        {
                            type: 'tool-call',
                            toolCallId: row.toolApprovalRequest.toolCallId,
                            toolName: row.toolApprovalRequest.toolName,
                            input: row.toolApprovalRequest.toolArgs as JSONValue,
                        },
                        {
                            type: 'tool-approval-request',
                            approvalId: row.toolApprovalRequest.approvalId,
                            toolCallId: row.toolApprovalRequest.toolCallId,
                        },
                    ],
                });
                break;
            }
            case 'toolApprovalResponse': {
                if (!row.toolApprovalResponse) continue;
                // Replayed as a `tool` message with a single
                // `tool-approval-response` part. When this is the last
                // message in the prompt, the SDK runs the approved tool's
                // `execute` itself (or pushes a synthetic `execution-denied`
                // result for declines) before stepping the LLM. We never
                // call `execute` from the respond command.
                //
                // `reason` (when present) rides along on the same part. The
                // SDK forwards it onto the synthetic denied tool-result so
                // the LLM sees *why* the human declined instead of a generic
                // "execution-denied" — matches the optional `reason` field
                // on `@ai-sdk/provider-utils` `ToolApprovalResponse`.
                messages.push({
                    role: 'tool',
                    content: [
                        {
                            type: 'tool-approval-response',
                            approvalId: row.toolApprovalResponse.approvalId,
                            approved: row.toolApprovalResponse.approved,
                            ...(row.toolApprovalResponse.reason ? { reason: row.toolApprovalResponse.reason } : {}),
                        },
                    ],
                });
                break;
            }
        }
    }

    return messages;
}

// Decide whether a file upload is sent as `ImagePart` or `FilePart`. Gemini
// (and most other providers) treat image MIME types specially when they're
// declared as `image`, but accept the same payload through `FilePart` as a
// fallback — we still keep the split because some providers refuse non-image
// content via `ImagePart`.
function toModelMessagePartForFileUpload(fileUpload: FileUpload): ImagePart | FilePart {
    if (fileUpload.mediaType.startsWith('image/')) {
        return {
            type: 'image',
            image: fileUpload.bytes,
            mediaType: fileUpload.mediaType,
        };
    }
    return {
        type: 'file',
        data: fileUpload.bytes,
        filename: fileUpload.filename,
        mediaType: fileUpload.mediaType,
    };
}
