import { asc, desc, sql } from 'drizzle-orm';
import { movies } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMediaMovie, GqlSSession } from '../graphql/generated';
import { toGqlAdminMediaMovie } from '../mappers/toGqlAdminMediaMovie';

// Lists every movie the admin tracks. Ordered so the two "active" buckets
// (watching, watchlist) come first — the media page groups by `status` and
// this order lets the grouped renderer stream sections in a sensible visual
// sequence without another client-side sort. Within a bucket, most-recently
// touched wins so a just-added movie is visible on top. See
// `docs/features/workspace-media.md`.
export async function adminMediaMovieFindMany(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminMediaMovie[]> {
    try {
        const rows = await serverRuntime.db
            .select()
            .from(movies)
            .orderBy(
                sql`CASE ${movies.status}
                        WHEN 'watching' THEN 0
                        WHEN 'watchlist' THEN 1
                        WHEN 'watched' THEN 2
                        WHEN 'dropped' THEN 3
                        ELSE 4
                    END`,
                desc(movies.updatedAt),
                asc(movies.movieId),
            );
        return rows.map(toGqlAdminMediaMovie);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
