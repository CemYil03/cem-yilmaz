import { eq } from 'drizzle-orm';
import type { Database, DatabaseTransaction } from '../db';
import {
    chatMessages,
    chatMessagesAssistantInputCollection,
    chatMessagesAssistantText,
    chatMessagesToolApprovalRequest,
    chatMessagesToolApprovalResponse,
    chatMessagesToolCall,
    chatMessagesUser,
    chatMessagesUserInput,
    users,
} from '../db/schema';
import type { ChatMessageRowJoined } from '../mappers/toGqlChatMessage';

// Shared row-loading primitives used by `chatMessageRowLoad` (single message)
// and `chatMessageRowsLoad` (entire chat). Both pull the spine + every variant
// table + the author user via LEFT JOIN; only the WHERE/ORDER BY/LIMIT differ.
// Centralizing the join shape and the row→`ChatMessageRowJoined` mapping means
// adding a new variant table touches exactly one file.

type DbOrTx = Database | DatabaseTransaction;

/** Build the joined `select().from(chatMessages).leftJoin(...)` query. The
 *  caller adds its own `where()`, `orderBy()`, and/or `limit()`. */
export function chatMessageRowsBaseQuery(dbOrTx: DbOrTx) {
    return dbOrTx
        .select()
        .from(chatMessages)
        .leftJoin(users, eq(users.userId, chatMessages.authorUserId))
        .leftJoin(chatMessagesUser, eq(chatMessagesUser.chatMessageId, chatMessages.chatMessageId))
        .leftJoin(chatMessagesAssistantText, eq(chatMessagesAssistantText.chatMessageId, chatMessages.chatMessageId))
        .leftJoin(chatMessagesToolCall, eq(chatMessagesToolCall.chatMessageId, chatMessages.chatMessageId))
        .leftJoin(chatMessagesToolApprovalRequest, eq(chatMessagesToolApprovalRequest.chatMessageId, chatMessages.chatMessageId))
        .leftJoin(chatMessagesToolApprovalResponse, eq(chatMessagesToolApprovalResponse.chatMessageId, chatMessages.chatMessageId))
        .leftJoin(chatMessagesAssistantInputCollection, eq(chatMessagesAssistantInputCollection.chatMessageId, chatMessages.chatMessageId))
        .leftJoin(chatMessagesUserInput, eq(chatMessagesUserInput.chatMessageId, chatMessages.chatMessageId));
}

type ChatMessageRowsBaseQueryResult = Awaited<ReturnType<typeof chatMessageRowsBaseQuery>>[number];

/** Map one driver-shaped row from `chatMessageRowsBaseQuery` to the
 *  `ChatMessageRowJoined` shape the mappers consume. */
export function toChatMessageRowJoined(row: ChatMessageRowsBaseQueryResult): ChatMessageRowJoined {
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
