import { and, desc, eq } from 'drizzle-orm';

import { chats } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSChat, GqlSSession } from '../graphql/generated';
import { toGqlChat } from '../mappers/toGqlChat';

// Lists this visitor's own public chats, newest first. Used by the chat
// dialog's empty state ("Frühere Chats / Previous chats") so a returning
// visitor can resume a prior conversation without retyping the question.
//
// Returns shells with `messages: []` — `Query.chat(chatId)` materializes a
// single transcript when the user actually picks one. Loading every
// transcript here would block dialog open on N reads.
//
// Bounded at 50 because the empty state is a small list, not a paginated
// inbox. A visitor with a higher count can still resume the newest 50;
// beyond that, the admin review surface (`Admin.publicChats`) has the
// historical view.
export async function chatsFindBySession(requestingSession: GqlSSession, serverRuntime: ServerRuntime): Promise<GqlSChat[]> {
    try {
        const rows = await serverRuntime.db
            .select()
            .from(chats)
            .where(and(eq(chats.scope, 'public'), eq(chats.sessionId, requestingSession.sessionId)))
            .orderBy(desc(chats.lastModifiedAt))
            .limit(50);
        return rows.map((chat) => toGqlChat(chat, []));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
