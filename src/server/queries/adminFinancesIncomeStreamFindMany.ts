import { asc } from 'drizzle-orm';
import { financeIncomeStreams } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminFinancesIncomeStream, GqlSSession } from '../graphql/generated';
import { toGqlAdminFinancesIncomeStream } from '../mappers/toGqlAdminFinancesIncomeStream';

// Lists every income stream (active and inactive). Ordered by name so the
// page list stays visually stable across a mutation.
export async function adminFinancesIncomeStreamFindMany(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminFinancesIncomeStream[]> {
    try {
        const rows = await serverRuntime.db.select().from(financeIncomeStreams).orderBy(asc(financeIncomeStreams.name));
        return rows.map(toGqlAdminFinancesIncomeStream);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
