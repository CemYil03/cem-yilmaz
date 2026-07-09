import { desc, eq } from 'drizzle-orm';
import { chats } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSChat, GqlSSession } from '../graphql/generated';
import { toGqlChat } from '../mappers/toGqlChat';
import { chatMessageFindMany } from './chatMessageFindMany';

// Lists every chat at a given scope, newest first by `lastModifiedAt`. Loads
// the full message transcript for each chat through the same path the
// per-chat read uses — the admin surface needs the message stream available
// inline without a per-row round-trip. The result set is small (one user;
// no public/admin chat fan-out yet) so a one-shot N+1 across the IDs is
// acceptable; if this ever grows, replace with a single bulk
// `chatMessageFindMany` driven by an `IN (...)` query.
export async function chatFindMany(
    scope: 'public' | 'admin',
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSChat[]> {
    try {
        const rows = await serverRuntime.db.select().from(chats).where(eq(chats.scope, scope)).orderBy(desc(chats.lastModifiedAt));
        const out: GqlSChat[] = [];
        for (const chat of rows) {
            const messageRows = await chatMessageFindMany(serverRuntime.db, chat.chatId);
            out.push(toGqlChat(chat, messageRows));
        }
        return out;
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
