import { and, eq, isNull } from 'drizzle-orm';
import { projectActivities } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSProjectActivity, GqlSSession } from '../graphql/generated';
import { toGqlProjectActivity } from '../mappers/toGqlProjectActivity';

// Returns the single currently-running work timer, or null. The partial
// unique index `ProjectActivities_singleActiveTimer_uniq` makes this
// query return at most one row even under concurrent starts — no
// `LIMIT 1` is required for correctness but is included for clarity.
export async function activeTimerGet(requestingSession: GqlSSession, serverRuntime: ServerRuntime): Promise<GqlSProjectActivity | null> {
    try {
        const [row] = await serverRuntime.db
            .select()
            .from(projectActivities)
            .where(and(eq(projectActivities.kind, 'work'), isNull(projectActivities.endedAt)))
            .limit(1);
        return row ? toGqlProjectActivity(row) : null;
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
