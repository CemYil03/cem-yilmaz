import { and, eq, exists, ilike, or, sql } from 'drizzle-orm';
import { chatMessages, chatMessagesUser, chats } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

// Shared search helpers used by `adminChatFindMany` and `adminChatCount`.
// `buildSearchCondition` returns `undefined` when `query` is blank so both
// callers can plug it straight into `and(...)` without an extra branch.

export const MAX_LIMIT = 20;

export function escapeLike(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export function buildSearchCondition(query: string | null | undefined, serverRuntime: ServerRuntime) {
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
