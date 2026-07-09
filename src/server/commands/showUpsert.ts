import { eq } from 'drizzle-orm';
import { shows } from '../db/schema';
import type { ShowCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationShowUpsertArgs, GqlSSession, GqlSShow } from '../graphql/generated';
import { toGqlShow } from '../mappers/toGqlShow';

// Two-phase upsert (same shape as `movieUpsert`). `showId` set → update;
// absent → insert. When `isCompleted` is true, next-season date fields are
// cleared so a finished show never carries a stale "next season" hint.
export async function showUpsert(
    userId: string,
    args: GqlSAdminMutationShowUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSShow> {
    const { input } = args;
    const showId = input.showId ?? crypto.randomUUID();
    const now = new Date();
    const isCompleted = input.isCompleted;
    const nextSeasonReleaseDate = isCompleted ? null : (input.nextSeasonReleaseDate ?? null);
    const nextSeasonReleaseRough = isCompleted ? null : (input.nextSeasonReleaseRough ?? null);

    const payload: ShowCreate = {
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
        nextSeasonReleaseDate,
        nextSeasonReleaseRough,
        updatedAt: now,
    };

    try {
        let row;
        if (input.showId) {
            const [updated] = await serverRuntime.db.update(shows).set(payload).where(eq(shows.showId, input.showId)).returning();
            if (!updated) {
                throw new Error(`showUpsert: row ${input.showId} not found`);
            }
            row = updated;
        } else {
            const [inserted] = await serverRuntime.db.insert(shows).values(payload).returning();
            if (!inserted) {
                throw new Error('showUpsert: insert returned no rows');
            }
            row = inserted;
        }
        await serverRuntime.publish.userUpdates({ userId });
        return toGqlShow(row);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
