import { and, asc, eq, gte, isNotNull, or, sql } from 'drizzle-orm';

import { VISITOR_CHAT_DAILY_LIMIT, VISITOR_CHAT_WINDOW_MS } from '../chat/visitorChatLimits';
import { chatMessages, chats, sessions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession, GqlSVisitorChatQuota } from '../graphql/generated';
import { toGqlVisitorChatQuota } from '../mappers/toGqlVisitorChatQuota';

// Rolling-24h quota snapshot for the requesting visitor.
//
// Counts `kind = 'user'` messages on `scope = 'public'` chats whose owning
// session matches either the requester's `sessionId` OR shares the same
// `ipHash`. The OR'd predicate is the rate limiter's bucket key — it means
// clearing the session cookie doesn't reset the daily count, but a sessionId
// with no resolvable `ipHash` (local dev, unproxied request) still works
// because the session arm of the OR doesn't depend on it.
//
// Probes `limit + 1` rows so the caller can distinguish "exactly at the
// limit" from "over" without pulling an unbounded count. The user-facing
// number is clamped by `toGqlVisitorChatQuota`.
export async function visitorChatQuotaFindOne(requestingSession: GqlSSession, serverRuntime: ServerRuntime): Promise<GqlSVisitorChatQuota> {
    try {
        const windowStart = new Date(Date.now() - VISITOR_CHAT_WINDOW_MS);

        // Resolve this session's `ipHash` once. Falling back to `null`
        // collapses the IP bucket to nothing — the OR'd predicate below still
        // includes the session bucket because the `sessionId` arm never
        // depends on `ipHash`.
        const [sessionRow] = await serverRuntime.db
            .select({ ipHash: sessions.ipHash })
            .from(sessions)
            .where(eq(sessions.sessionId, requestingSession.sessionId));
        const ipHash = sessionRow?.ipHash ?? null;

        const ipBucketPredicate = ipHash !== null ? and(isNotNull(sessions.ipHash), eq(sessions.ipHash, ipHash)) : sql`false`;

        const rows = await serverRuntime.db
            .select({ createdAt: chatMessages.createdAt })
            .from(chatMessages)
            .innerJoin(chats, eq(chats.chatId, chatMessages.chatId))
            .innerJoin(sessions, eq(sessions.sessionId, chats.sessionId))
            .where(
                and(
                    eq(chats.scope, 'public'),
                    eq(chatMessages.kind, 'user'),
                    gte(chatMessages.createdAt, windowStart),
                    or(eq(sessions.sessionId, requestingSession.sessionId), ipBucketPredicate),
                ),
            )
            .orderBy(asc(chatMessages.createdAt))
            .limit(VISITOR_CHAT_DAILY_LIMIT + 1);

        return toGqlVisitorChatQuota(rows.map((row) => row.createdAt));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
