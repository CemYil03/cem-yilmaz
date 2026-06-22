import { VISITOR_CHAT_DAILY_LIMIT, VISITOR_CHAT_WINDOW_MS } from '../chat/visitorChatLimits';
import type { GqlSVisitorChatQuota } from '../graphql/generated';

// Builds the GraphQL quota snapshot from the `createdAt` timestamps of every
// visitor user-message inside the current 24h window for this requester.
//
// `used` is clamped at the limit so a saturated session still renders "10 /
// 10" rather than "11 / 10" — the query intentionally probes one row past
// the limit so the limit check itself stays cheap, but the user-facing
// number must not leak the probe.
//
// `resetsAt` is the moment the oldest in-window message ages out — that's
// when the bucket would drop the requester back to `limit - 1` and they
// could send again. Null when `used = 0` (nothing to reset).
export function toGqlVisitorChatQuota(createdAts: ReadonlyArray<Date>): GqlSVisitorChatQuota {
    const sortedAsc = [...createdAts].sort((a, b) => a.getTime() - b.getTime());
    const oldest = sortedAsc[0] ?? null;
    return {
        used: Math.min(sortedAsc.length, VISITOR_CHAT_DAILY_LIMIT),
        limit: VISITOR_CHAT_DAILY_LIMIT,
        resetsAt: oldest ? new Date(oldest.getTime() + VISITOR_CHAT_WINDOW_MS) : null,
    };
}
