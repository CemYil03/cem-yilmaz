import { and, count, eq } from 'drizzle-orm';
import { chats } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminAdminChatCountArgs, GqlSSession } from '../graphql/generated';
import { buildSearchCondition } from './chatSearchCondition';

// Total number of admin chats matching the same optional `query` as
// `adminChatFindMany(...)`. The client subtracts `offset + items.length` to
// decide whether "Show more" is still meaningful.
export async function adminChatCount(
    args: GqlSAdminAdminChatCountArgs,
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
