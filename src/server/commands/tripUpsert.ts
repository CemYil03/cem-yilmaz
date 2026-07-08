import { eq } from 'drizzle-orm';
import { trips } from '../db/schema';
import type { TripCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession, GqlSTrip, GqlSTripInput } from '../graphql/generated';
import { tripGet } from '../queries/tripGet';

// Two-phase upsert of a trip. `tripId` set → update; absent → insert. The
// FK cascade on `TripDays` / `TripActivities` / `TripPackingItems` means an
// update never orphans children. Returns the fully hydrated trip (days,
// activities, packing) so the UI's optimistic replacement is complete.
export async function tripUpsert(
    userId: string,
    input: GqlSTripInput,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSTrip> {
    const tripId = input.tripId ?? crypto.randomUUID();
    const now = new Date();

    const payload: TripCreate = {
        tripId,
        title: input.title,
        destination: input.destination,
        startsOn: input.startsOn ?? null,
        endsOn: input.endsOn ?? null,
        status: input.status,
        transportMode: input.transportMode ?? null,
        accommodation: input.accommodation ?? null,
        notes: input.notes ?? null,
        updatedAt: now,
    };

    try {
        if (input.tripId) {
            const [updated] = await serverRuntime.db.update(trips).set(payload).where(eq(trips.tripId, input.tripId)).returning();
            if (!updated) throw new Error(`tripUpsert: row ${input.tripId} not found`);
        } else {
            const [inserted] = await serverRuntime.db.insert(trips).values(payload).returning();
            if (!inserted) throw new Error('tripUpsert: insert returned no rows');
        }

        const trip = await tripGet(tripId, requestingSession, serverRuntime);
        if (!trip) throw new Error(`tripUpsert: could not re-read trip ${tripId}`);
        await serverRuntime.publish.userUpdates({ userId });
        return trip;
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
