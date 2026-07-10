import { eq, inArray } from 'drizzle-orm';
import { shows } from '../db/schema';
import type { AdminMediaShowCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession, GqlSAdminMediaShowInput } from '../graphql/generated';

// Batch upsert of TV series. Every input with a `showId` is updated; every
// input without one is inserted under a freshly-minted UUID. The whole batch
// runs inside a single transaction so a partial failure rolls back to zero
// writes. `referenceIds` echoes the id per input row (in input order). When
// `isCompleted` is true, next-season date fields are cleared so a finished
// show never carries a stale "next season" hint.
export async function adminMediaShowsUpsert(
    userId: string,
    inputs: readonly GqlSAdminMediaShowInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction.
    const rows = inputs.map((input) => {
        const showId = input.showId ?? crypto.randomUUID();
        const isCompleted = input.isCompleted;
        const payload: AdminMediaShowCreate = {
            showId,
            title: input.title,
            tmdbId: input.tmdbId ?? null,
            posterUrl: input.posterUrl ?? null,
            backdropUrl: input.backdropUrl ?? null,
            firstAirDate: input.firstAirDate ?? null,
            overview: input.overview ?? null,
            status: input.status,
            rating: input.rating ?? null,
            notes: input.notes ?? null,
            topics: input.topics,
            isCompleted,
            nextSeasonReleaseDate: isCompleted ? null : (input.nextSeasonReleaseDate ?? null),
            nextSeasonReleaseRough: isCompleted ? null : (input.nextSeasonReleaseRough ?? null),
            updatedAt: now,
        };
        return { showId, isUpdate: Boolean(input.showId), payload };
    });

    // Phase 2 — transactional execution.
    try {
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.showId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction.select({ showId: shows.showId }).from(shows).where(inArray(shows.showId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.showId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`adminMediaShowsUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction.update(shows).set(row.payload).where(eq(shows.showId, row.showId));
                } else {
                    await transaction.insert(shows).values(row.payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.showId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
