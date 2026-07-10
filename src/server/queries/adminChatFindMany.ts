import { and, desc, eq } from 'drizzle-orm';
import { chats } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminAdminChatFindManyArgs, GqlSChat, GqlSSession } from '../graphql/generated';
import { toGqlChat } from '../mappers/toGqlChat';
import { buildSearchCondition, MAX_LIMIT } from './chatSearchCondition';

// Admin chat browser feed. Backs the workspace assistant sidebar's chat
// list. Returns shells with empty `messages` — the sidebar fetches a
// transcript through `adminChatFindOne(chatId)` when the user opens one, so
// keeping this list lean lets it scale as the chat history grows.
//
// All three arguments are optional. Absent them the field is equivalent
// to "give me every admin chat, newest first":
//
// - `limit` is clamped so a caller cannot pull the whole table with one
//   call. The client pages by 10; the server ceiling doubles that to
//   leave room for future tweaks without a wire change. Omitted `limit`
//   defaults to the ceiling.
// - `offset` is a plain numeric cursor. A timestamp cursor would be more
//   robust against inserts during pagination, but this list is scoped to
//   one admin (the workspace) — the drift window is small enough that
//   simple offsets carry no user-visible cost.
// - `query` matches EITHER the chat title OR any `ChatMessagesUser.body`
//   under the chat (case-insensitive substring). Assistant text is
//   intentionally NOT searched: the intent of "search my chats" is "find
//   the chat where I said X" — a model's paraphrase of the same idea
//   should not eclipse the user's own words in the results.
//
// Pair with `adminChatCount(query)` to drive "AdminMediaShow more" pagination.
export async function adminChatFindMany(
    args: GqlSAdminAdminChatFindManyArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSChat[]> {
    const limit = args.limit != null ? Math.max(1, Math.min(args.limit, MAX_LIMIT)) : MAX_LIMIT;
    const offset = args.offset != null ? Math.max(0, args.offset) : 0;
    const whereClause = and(eq(chats.scope, 'admin'), buildSearchCondition(args.query, serverRuntime));

    try {
        const rows = await serverRuntime.db
            .select()
            .from(chats)
            .where(whereClause)
            .orderBy(desc(chats.lastModifiedAt))
            .limit(limit)
            .offset(offset);
        // Shells only — sidebar reads the transcript on demand.
        return rows.map((chat) => toGqlChat(chat, []));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
