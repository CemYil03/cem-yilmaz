import { and, desc, eq, exists, ilike, or, sql, count } from 'drizzle-orm';
import { chatMessages, chatMessagesUser, chats } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminChatsArgs, GqlSAdminChatsCountArgs, GqlSChat, GqlSSession } from '../graphql/generated';
import { toGqlChat } from '../mappers/toGqlChat';

// Admin chat browser feed. Backs the workspace assistant sidebar's chat
// list. Returns shells with empty `messages` — the sidebar fetches a
// transcript through `chat(chatId)` when the user opens one, so keeping
// this list lean lets it scale as the chat history grows.
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
// `chatsCount(query)` (below) reads the same filter and returns the row
// count so the client can gate its "Show more" button against
// `count - (offset + items.length)`.

const MAX_LIMIT = 20;

function escapeLike(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

// Search predicate shared by `adminChats` and `adminChatsCount`. Returns
// `undefined` when the query is blank so the two callers can plug it
// straight into `and(...)` without an extra branch.
function buildSearchCondition(query: string | null | undefined, serverRuntime: ServerRuntime) {
    const trimmed = query?.trim() ?? '';
    if (!trimmed) return undefined;
    return or(
        ilike(chats.title, `%${escapeLike(trimmed)}%`),
        exists(
            serverRuntime.db
                .select({ one: sql`1` })
                .from(chatMessages)
                .innerJoin(chatMessagesUser, eq(chatMessagesUser.chatMessageId, chatMessages.chatMessageId))
                .where(and(eq(chatMessages.chatId, chats.chatId), ilike(chatMessagesUser.body, `%${escapeLike(trimmed)}%`))),
        ),
    );
}

export async function adminChats(
    args: GqlSAdminChatsArgs,
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

export async function adminChatsCount(
    args: GqlSAdminChatsCountArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<number> {
    const whereClause = and(eq(chats.scope, 'admin'), buildSearchCondition(args.query, serverRuntime));

    try {
        const [row] = await serverRuntime.db.select({ total: count() }).from(chats).where(whereClause);
        return row?.total ?? 0;
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
