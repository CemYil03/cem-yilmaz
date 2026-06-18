import { eq } from 'drizzle-orm';
import { chats } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSChat, GqlSSession, GqlSSessionChatArgs } from '../graphql/generated';
import { toGqlChat } from '../mappers/toGqlChat';
import { chatMessageRowsLoad } from './chatMessageRowsLoad';

export async function chatFindOne(
    { chatId }: GqlSSessionChatArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSChat> {
    try {
        const [chat] = await serverRuntime.db.select().from(chats).where(eq(chats.chatId, chatId));
        if (!chat) {
            throw new Error('chat not found');
        }

        const rows = await chatMessageRowsLoad(serverRuntime.db, chatId);
        return toGqlChat(chat, rows);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
