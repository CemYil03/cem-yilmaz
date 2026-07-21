import { eq } from 'drizzle-orm';
import { chats } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSChat, GqlSSession } from '../graphql/generated';
import { toGqlChat } from '../mappers/toGqlChat';
import { chatMessageFindMany } from './chatMessageFindMany';

// Resolves a single visitor (`scope = 'public'`) chat by id and enforces
// session ownership: the chat row's `sessionId` must equal the requester's
// `sessionId`. Scope mismatches and cross-session reads are rejected with
// the same generic "not found" error so a probing client can't tell whether
// a chatId exists but belongs to another session, or doesn't exist at all.
// Admin reads continue to flow through `Query.admin.chat` /
// `Query.admin.publicChat`, which bypass session ownership by design. See
// `docs/architecture/chat.md`.
export async function visitorChatFindOne(chatId: string, requestingSession: GqlSSession, serverRuntime: ServerRuntime): Promise<GqlSChat> {
    try {
        const [chat] = await serverRuntime.db.select().from(chats).where(eq(chats.chatId, chatId));
        if (!chat || chat.scope !== 'public' || chat.sessionId !== requestingSession.sessionId) {
            throw new Error(`chat ${chatId} not found`);
        }

        const rows = await chatMessageFindMany(serverRuntime.db, chatId);
        return toGqlChat(chat, rows);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
