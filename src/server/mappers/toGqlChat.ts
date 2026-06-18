import type { Chat } from '../db/schema';
import type { GqlSChat } from '../graphql/generated';
import { toGqlChatMessage } from './toGqlChatMessage';
import type { ChatMessageRowJoined } from './toGqlChatMessage';

export function toGqlChat(chat: Chat, rows: ChatMessageRowJoined[]): GqlSChat {
    return {
        chatId: chat.chatId,
        title: chat.title,
        lastModifiedAt: chat.lastModifiedAt,

        // resolved fields
        // Insertion-ordered (rows arrive sorted by `chatMessageRowsLoad`); the
        // client groups by date at render time so the subscription's raw
        // appended messages can land in the right group without a refetch.
        messages: rows.map(toGqlChatMessage),
    };
}
