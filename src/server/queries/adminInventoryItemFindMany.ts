import { asc, desc, eq } from 'drizzle-orm';
import { items } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminInventoryItem, GqlSSession } from '../graphql/generated';
import { toGqlAdminInventoryItem } from '../mappers/toGqlAdminInventoryItem';

// Lists every tracked item, most-recently-touched first. `valuations`,
// `serviceEntries`, and `files` come back empty — the detail route uses
// `itemGet` for the full picture. Same list/detail split
// `projectsList` / `projectGet` uses.
//
// `includeDisposed = false` hides rows whose `disposalState !== 'owned'`
// so the default surface stays focused on currently-owned things.
export async function adminInventoryItemFindMany(
    includeDisposed: boolean,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminInventoryItem[]> {
    try {
        const rows = includeDisposed
            ? await serverRuntime.db.select().from(items).orderBy(desc(items.updatedAt), asc(items.itemId))
            : await serverRuntime.db
                  .select()
                  .from(items)
                  .where(eq(items.disposalState, 'owned'))
                  .orderBy(desc(items.updatedAt), asc(items.itemId));
        return rows.map(toGqlAdminInventoryItem);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
