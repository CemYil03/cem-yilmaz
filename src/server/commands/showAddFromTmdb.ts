import { eq } from 'drizzle-orm';
import { shows } from '../db/schema';
import type { ShowCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationShowAddFromTmdbArgs, GqlSSession, GqlSShow } from '../graphql/generated';
import { toGqlShow } from '../mappers/toGqlShow';

// Fetches full TV detail from TMDB and either creates a new `Shows` row or
// refreshes metadata on the row that already carries the same `tmdbId`.
// Seeds `isCompleted` / `nextSeasonReleaseDate` from TMDB when available;
// `nextSeasonReleaseRough` is admin-authored and preserved on refresh.
// See `docs/features/workspace-media.md`.
export async function showAddFromTmdb(
    userId: string,
    args: GqlSAdminMutationShowAddFromTmdbArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSShow> {
    const { tmdbId } = args;
    const status = args.status ?? 'watchlist';
    const now = new Date();

    try {
        const detail = await serverRuntime.tmdb.getTv(tmdbId);

        const [existing] = await serverRuntime.db.select().from(shows).where(eq(shows.tmdbId, tmdbId)).limit(1);

        if (existing) {
            // Refresh TMDB-sourced metadata. Preserve admin lifecycle fields
            // (status, rating, notes, topics, rough next-season label). Only
            // overwrite `isCompleted` / exact next-season date when TMDB
            // returned a value — never clobber an admin override with null.
            const [updated] = await serverRuntime.db
                .update(shows)
                .set({
                    title: detail?.title ?? existing.title,
                    posterUrl: detail?.posterUrl ?? existing.posterUrl,
                    backdropUrl: detail?.backdropUrl ?? existing.backdropUrl,
                    firstAirDate: detail?.firstAirDate ?? existing.firstAirDate,
                    overview: detail?.overview ?? existing.overview,
                    isCompleted: detail?.isCompleted ?? existing.isCompleted,
                    nextSeasonReleaseDate:
                        detail?.isCompleted === true ? null : (detail?.nextSeasonReleaseDate ?? existing.nextSeasonReleaseDate),
                    nextSeasonReleaseRough: detail?.isCompleted === true ? null : existing.nextSeasonReleaseRough,
                    updatedAt: now,
                })
                .where(eq(shows.showId, existing.showId))
                .returning();
            if (!updated) {
                throw new Error(`showAddFromTmdb: refresh failed for tmdbId ${tmdbId}`);
            }
            await serverRuntime.publish.userUpdates({ userId });
            return toGqlShow(updated);
        }

        const isCompleted = detail?.isCompleted ?? false;
        const payload: ShowCreate = {
            showId: crypto.randomUUID(),
            title: detail?.title ?? `TMDB TV #${tmdbId}`,
            tmdbId,
            posterUrl: detail?.posterUrl ?? null,
            backdropUrl: detail?.backdropUrl ?? null,
            firstAirDate: detail?.firstAirDate ?? null,
            overview: detail?.overview ?? null,
            status,
            rating: null,
            notes: null,
            topics: [],
            isCompleted,
            nextSeasonReleaseDate: isCompleted ? null : (detail?.nextSeasonReleaseDate ?? null),
            nextSeasonReleaseRough: null,
            updatedAt: now,
        };
        const [inserted] = await serverRuntime.db.insert(shows).values(payload).returning();
        if (!inserted) {
            throw new Error('showAddFromTmdb: insert returned no rows');
        }
        await serverRuntime.publish.userUpdates({ userId });
        return toGqlShow(inserted);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
