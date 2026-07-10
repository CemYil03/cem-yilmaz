import { asc, eq, inArray } from 'drizzle-orm';
import { tripActivities, tripDays, tripPackingItems, trips } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminTravelTrip, GqlSAdminTravelTripDay, GqlSSession } from '../graphql/generated';
import { toGqlAdminTravelTrip } from '../mappers/toGqlAdminTravelTrip';
import { toGqlAdminTravelTripActivity } from '../mappers/toGqlAdminTravelTripActivity';
import { toGqlAdminTravelTripDay } from '../mappers/toGqlAdminTravelTripDay';
import { toGqlAdminTravelTripPackingItem } from '../mappers/toGqlAdminTravelTripPackingItem';

// Single trip by id, fully hydrated with days (each with activities) and
// packing items. Returns null on a miss so the resolver can surface that as
// a not-found rather than a throw. Same fan-out shape as `tripList` scoped
// to one trip.
export async function adminTravelTripFindOne(
    tripId: string,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminTravelTrip | null> {
    try {
        const [row] = await serverRuntime.db.select().from(trips).where(eq(trips.tripId, tripId)).limit(1);
        if (!row) return null;

        const dayRows = await serverRuntime.db.select().from(tripDays).where(eq(tripDays.tripId, tripId)).orderBy(asc(tripDays.dayNumber));

        const activitiesByDayId = new Map<string, GqlSAdminTravelTripDay['activities']>();
        if (dayRows.length > 0) {
            const dayIds = dayRows.map((d) => d.tripDayId);
            const activityRows = await serverRuntime.db
                .select()
                .from(tripActivities)
                .where(inArray(tripActivities.tripDayId, dayIds))
                .orderBy(asc(tripActivities.tripDayId), asc(tripActivities.position), asc(tripActivities.tripActivityId));
            for (const a of activityRows) {
                const list = activitiesByDayId.get(a.tripDayId) ?? [];
                list.push(toGqlAdminTravelTripActivity(a));
                activitiesByDayId.set(a.tripDayId, list);
            }
        }

        const packingRows = await serverRuntime.db
            .select()
            .from(tripPackingItems)
            .where(eq(tripPackingItems.tripId, tripId))
            .orderBy(asc(tripPackingItems.category), asc(tripPackingItems.position), asc(tripPackingItems.tripPackingItemId));

        const days = dayRows.map((d) => toGqlAdminTravelTripDay(d, activitiesByDayId.get(d.tripDayId) ?? []));
        const packingItems = packingRows.map(toGqlAdminTravelTripPackingItem);
        return toGqlAdminTravelTrip(row, days, packingItems);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
