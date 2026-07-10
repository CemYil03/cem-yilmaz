import { asc, desc, sql } from 'drizzle-orm';
import { shows } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession, GqlSAdminMediaShow } from '../graphql/generated';
import { toGqlAdminMediaShow } from '../mappers/toGqlAdminMediaShow';

// Lists every TV series the admin tracks. Same status-bucket ordering as
// `adminMediaMovieFindMany` so the Serien tab streams Watching → Watchlist →
// Watched → Dropped without a client-side re-sort. See
// `docs/features/workspace-media.md`.
export async function adminMediaShowFindMany(requestingSession: GqlSSession, serverRuntime: ServerRuntime): Promise<GqlSAdminMediaShow[]> {
    try {
        const rows = await serverRuntime.db
            .select()
            .from(shows)
            .orderBy(
                sql`CASE ${shows.status}
                        WHEN 'watching' THEN 0
                        WHEN 'watchlist' THEN 1
                        WHEN 'watched' THEN 2
                        WHEN 'dropped' THEN 3
                        ELSE 4
                    END`,
                desc(shows.updatedAt),
                asc(shows.showId),
            );
        return rows.map(toGqlAdminMediaShow);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
