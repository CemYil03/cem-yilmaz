import { asc } from 'drizzle-orm';
import { financeAssets } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminFinancesAsset, GqlSSession } from '../graphql/generated';
import { toGqlAdminFinancesAsset } from '../mappers/toGqlAdminFinancesAsset';

// Lists every wealth asset (active and inactive). Ordered by kind then name
// so the Wealth tab's kind groups stay visually stable across mutations.
export async function adminFinancesAssetFindMany(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminFinancesAsset[]> {
    try {
        const rows = await serverRuntime.db.select().from(financeAssets).orderBy(asc(financeAssets.kind), asc(financeAssets.name));
        return rows.map(toGqlAdminFinancesAsset);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
