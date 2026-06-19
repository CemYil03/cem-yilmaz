import { eq } from 'drizzle-orm';
import { chats } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSChat, GqlSSession } from '../graphql/generated';
import { toGqlChat } from '../mappers/toGqlChat';
import { chatMessageRowsLoad } from './chatMessageRowsLoad';

// Resolves a chat by id and refuses to return one whose `scope` doesn't match
// the namespace the read came from (visitor `Query.chat`, admin
// `Query.admin.chat`, admin `Query.admin.publicChat`). The scope check is the
// one knob that splits the read surface — without it a stolen chatId could
// flow across namespaces. See `docs/architecture/multi-agent-chat.md`.
export async function chatFindByScope(
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

        const rows = await chatMessageRowsLoad(serverRuntime.db, chatId);
        return toGqlChat(chat, rows);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
