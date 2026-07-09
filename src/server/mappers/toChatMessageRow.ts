import type { chatMessageBaseQuery } from '../queries/chatMessageBaseQuery';
import type { ChatMessageRowJoined } from './toGqlChatMessage';

type ChatMessageBaseQueryResult = Awaited<ReturnType<typeof chatMessageBaseQuery>>[number];

/** Map one driver-shaped row from `chatMessageBaseQuery` to the
 *  `ChatMessageRowJoined` shape the mappers consume. */
export function toChatMessageRow(row: ChatMessageBaseQueryResult): ChatMessageRowJoined {
    return {
        spine: row.ChatMessages,
        author: row.Users,
        user: row.ChatMessagesUser ?? undefined,
        assistantText: row.ChatMessagesAssistantText ?? undefined,
        toolCall: row.ChatMessagesToolCall ?? undefined,
        toolApprovalRequest: row.ChatMessagesToolApprovalRequest ?? undefined,
        toolApprovalResponse: row.ChatMessagesToolApprovalResponse ?? undefined,
        assistantInputCollection: row.ChatMessagesAssistantInputCollection ?? undefined,
        userInput: row.ChatMessagesUserInput ?? undefined,
    };
}
