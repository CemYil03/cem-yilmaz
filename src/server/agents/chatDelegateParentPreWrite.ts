import type { JSONValue } from 'ai';
import { chatMessageAppend } from '../commands/chatMessageAppend';
import type { ChatMessageCreate as ChatMessageRowCreate, ChatMessageToolCallCreate } from '../db/schema';
import { chatMessagesToolCall } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { ChatStepArtifact } from './chatStepArtifact';
import { chatStepArtifactClaimFirstMessageId, chatStepArtifactReasoningOrNull } from './chatStepArtifact';

// Shared pre-write for every `delegateTo*` tool: insert the parent
// `chatMessagesToolCall` row (result still null) so nested sub-agent tool
// calls can FK to it, claim the current LLM step's live Thinking id when
// present, and register the call so the orchestrator's `onStepEnd` skips a
// duplicate insert. See `docs/architecture/agent-delegation.md`.

export async function chatDelegateParentPreWrite({
    serverRuntime,
    chatId,
    generationId,
    toolCallId,
    toolName,
    toolArgs,
    preWrittenToolCallIds,
    stepArtifact,
}: {
    serverRuntime: ServerRuntime;
    chatId: string;
    generationId: string | null | undefined;
    toolCallId: string;
    toolName: string;
    toolArgs: JSONValue;
    preWrittenToolCallIds: Set<string>;
    stepArtifact?: ChatStepArtifact;
}): Promise<string> {
    const claimedId = chatStepArtifactClaimFirstMessageId(stepArtifact);
    const parentChatMessageId = claimedId ?? crypto.randomUUID();
    const reasoning = claimedId != null ? chatStepArtifactReasoningOrNull(stepArtifact) : null;
    const parentSpine: ChatMessageRowCreate = {
        chatMessageId: parentChatMessageId,
        chatId,
        kind: 'toolCall',
        authorUserId: null,
        parentChatMessageId: null,
        createdAt: new Date(),
    };
    const parentVariant: ChatMessageToolCallCreate = {
        chatMessageId: parentChatMessageId,
        toolCallId,
        toolName,
        toolArgs,
        toolResult: null,
        resultedAt: null,
        reasoning,
    };
    await chatMessageAppend(serverRuntime.db, serverRuntime, generationId, parentSpine, async (transaction) => {
        await transaction.insert(chatMessagesToolCall).values(parentVariant);
    });
    preWrittenToolCallIds.add(toolCallId);
    return parentChatMessageId;
}
