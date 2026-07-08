import { asc, eq, inArray } from 'drizzle-orm';
import { tripActivities, tripDays, trips } from '../db/schema';
import type { TripDayCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationTripDayUpsertArgs, GqlSSession, GqlSTripDay } from '../graphql/generated';
import { toGqlTripActivity } from '../mappers/toGqlTripActivity';
import { toGqlTripDay } from '../mappers/toGqlTripDay';

// Upsert a `TripDay`. Verifies the parent trip exists (a foreign or deleted
// `tripId` would otherwise land as an FK violation), then insert-or-update.
// `dayNumber` is unique per trip — a collision surfaces as the DB unique-
// index violation on `TripDays_tripId_dayNumber_uniq`.
export async function tripDayUpsert(
    userId: string,
    args: GqlSAdminMutationTripDayUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSTripDay> {
    const { input } = args;
    const tripDayId = input.tripDayId ?? crypto.randomUUID();
    const now = new Date();

    const payload: TripDayCreate = {
        tripDayId,
        tripId: input.tripId,
        dayNumber: input.dayNumber,
        date: input.date ?? null,
        title: input.title ?? null,
        summary: input.summary ?? null,
        updatedAt: now,
    };

    try {
        const [parent] = await serverRuntime.db.select({ tripId: trips.tripId }).from(trips).where(eq(trips.tripId, input.tripId)).limit(1);
        if (!parent) throw new Error(`tripDayUpsert: trip ${input.tripId} not found`);

        let row;
        if (input.tripDayId) {
            const [updated] = await serverRuntime.db
                .update(tripDays)
                .set(payload)
                .where(eq(tripDays.tripDayId, input.tripDayId))
                .returning();
            if (!updated) throw new Error(`tripDayUpsert: row ${input.tripDayId} not found`);
            row = updated;
        } else {
            const [inserted] = await serverRuntime.db.insert(tripDays).values(payload).returning();
            if (!inserted) throw new Error('tripDayUpsert: insert returned no rows');
            row = inserted;
        }

        const activityRows = await serverRuntime.db
            .select()
            .from(tripActivities)
            .where(inArray(tripActivities.tripDayId, [tripDayId]))
            .orderBy(asc(tripActivities.position), asc(tripActivities.tripActivityId));

        await serverRuntime.publish.userUpdates({ userId });
        return toGqlTripDay(row, activityRows.map(toGqlTripActivity));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
