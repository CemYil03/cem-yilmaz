import { eq } from 'drizzle-orm';
import { shows } from '../db/schema';
import type { AdminMediaShowCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession, GqlSAdminMediaShowAddFromTmdbInput } from '../graphql/generated';

// Batch add of TV series by TMDB id. Each input either creates a new `Shows`
// row or refreshes metadata on the row that already carries the same
// `tmdbId`. Seeds `isCompleted` / `nextSeasonReleaseDate` from TMDB when
// available; `nextSeasonReleaseRough` is admin-authored and preserved on
// refresh.
//
// The TMDB fetches happen OUTSIDE the transaction (in parallel); only the DB
// writes run inside it so a partial failure rolls back to zero writes.
// `referenceIds` echoes the resolved `showId` per input in input order.
// See `docs/features/workspace-media.md`.
export async function adminMediaShowsAddFromTmdb(
    userId: string,
    inputs: readonly GqlSAdminMediaShowAddFromTmdbInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    try {
        // Phase 1 — TMDB fetches in parallel, outside the transaction.
        const details = await Promise.all(inputs.map((input) => serverRuntime.tmdb.getTv(input.tmdbId)));

        // Phase 2 — transactional DB writes.
        const referenceIds: string[] = [];
        await serverRuntime.db.transaction(async (transaction) => {
            for (let index = 0; index < inputs.length; index += 1) {
                const input = inputs[index]!;
                const detail = details[index];
                const status = input.status ?? 'watchlist';

                const [existing] = await transaction.select().from(shows).where(eq(shows.tmdbId, input.tmdbId)).limit(1);

                if (existing) {
                    // Refresh TMDB-sourced metadata. Preserve admin lifecycle
                    // fields (status, rating, notes, topics, rough
                    // next-season label). Only overwrite `isCompleted` / exact
                    // next-season date when TMDB returned a value — never
                    // clobber an admin override with null.
                    const [updated] = await transaction
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
                        .returning({ showId: shows.showId });
                    if (!updated) {
                        throw new Error(`adminMediaShowsAddFromTmdb: refresh failed for tmdbId ${input.tmdbId}`);
                    }
                    referenceIds.push(updated.showId);
                    continue;
                }

                const isCompleted = detail?.isCompleted ?? false;
                const payload: AdminMediaShowCreate = {
                    showId: crypto.randomUUID(),
                    title: detail?.title ?? `TMDB TV #${input.tmdbId}`,
                    tmdbId: input.tmdbId,
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
                const [inserted] = await transaction.insert(shows).values(payload).returning({ showId: shows.showId });
                if (!inserted) {
                    throw new Error('adminMediaShowsAddFromTmdb: insert returned no rows');
                }
                referenceIds.push(inserted.showId);
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
