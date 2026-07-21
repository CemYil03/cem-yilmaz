import { eq } from 'drizzle-orm';
import { chats } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSChat, GqlSSession } from '../graphql/generated';
import { toGqlChat } from '../mappers/toGqlChat';
import { chatMessageFindMany } from './chatMessageFindMany';

// Resolves a chat by id and refuses to return one whose `scope` doesn't match
// the namespace the read came from (admin `Query.admin.chat`, admin
// `Query.admin.publicChat`). The scope check is the one knob that splits the
// admin read surface — without it a stolen chatId could flow across
// namespaces. Visitor reads go through `Session.visitorChat` /
// `visitorChatFindOne` instead, which additionally enforces session ownership.
// See `docs/architecture/chat.md`.
export async function chatFindOne(
    chatId: string,
    expectedScope: 'public' | 'admin',
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSChat> {
    try {
        const [chat] = await serverRuntime.db.select().from(chats).where(eq(chats.chatId, chatId));
        if (!chat) {
            throw new Error(`chat ${chatId} not found`);
        }
        if (chat.scope !== expectedScope) {
            throw new Error(`chat ${chatId} has scope=${chat.scope} but query requires scope=${expectedScope}`);
        }

        const rows = await chatMessageFindMany(serverRuntime.db, chatId);
        return toGqlChat(chat, rows);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
