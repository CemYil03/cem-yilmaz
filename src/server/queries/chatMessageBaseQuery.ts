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

// Shared row-loading primitive used by `chatMessageFindOne` (single message)
// and `chatMessageFindMany` (entire chat). Both pull the spine + every variant
// table + the author user via LEFT JOIN; only the WHERE/ORDER BY/LIMIT differ.
// Centralizing the join shape means adding a new variant table touches exactly
// one file.

type DbOrTx = Database | DatabaseTransaction;

/** Build the joined `select().from(chatMessages).leftJoin(...)` query. The
 *  caller adds its own `where()`, `orderBy()`, and/or `limit()`. */
export function chatMessageBaseQuery(dbOrTx: DbOrTx) {
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
