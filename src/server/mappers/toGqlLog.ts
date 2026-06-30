import type { Log } from '../db/schema';
import type { GqlSLog } from '../graphql/generated';

// `context` is stored as `jsonb` so Drizzle hands it back as `unknown`. The
// GraphQL `JSON` scalar accepts any value, so the cast is purely a type-level
// nudge — the bytes are whatever the logger originally serialized.
export function toGqlLog(row: Log): GqlSLog {
    return {
        logId: row.logId,
        level: row.level as GqlSLog['level'],
        message: row.message,
        sessionId: row.sessionId,
        context: row.context ?? null,
        createdAt: row.createdAt,
    };
}
