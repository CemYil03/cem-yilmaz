import { asc, eq, inArray } from 'drizzle-orm';
import { adminTravelTripActivities, adminTravelTripDays, adminTravelTripPackingItems, adminTravelTrips } from '../db/schema';
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
        const [row] = await serverRuntime.db.select().from(adminTravelTrips).where(eq(adminTravelTrips.tripId, tripId)).limit(1);
        if (!row) return null;

        const dayRows = await serverRuntime.db
            .select()
            .from(adminTravelTripDays)
            .where(eq(adminTravelTripDays.tripId, tripId))
            .orderBy(asc(adminTravelTripDays.dayNumber));

        const activitiesByDayId = new Map<string, GqlSAdminTravelTripDay['activities']>();
        if (dayRows.length > 0) {
            const dayIds = dayRows.map((d) => d.tripDayId);
            const activityRows = await serverRuntime.db
                .select()
                .from(adminTravelTripActivities)
                .where(inArray(adminTravelTripActivities.tripDayId, dayIds))
                .orderBy(
                    asc(adminTravelTripActivities.tripDayId),
                    asc(adminTravelTripActivities.position),
                    asc(adminTravelTripActivities.tripActivityId),
                );
            for (const a of activityRows) {
                const list = activitiesByDayId.get(a.tripDayId) ?? [];
                list.push(toGqlAdminTravelTripActivity(a));
                activitiesByDayId.set(a.tripDayId, list);
            }
        }

        const packingRows = await serverRuntime.db
            .select()
            .from(adminTravelTripPackingItems)
            .where(eq(adminTravelTripPackingItems.tripId, tripId))
            .orderBy(
                asc(adminTravelTripPackingItems.category),
                asc(adminTravelTripPackingItems.position),
                asc(adminTravelTripPackingItems.tripPackingItemId),
            );

        const days = dayRows.map((d) => toGqlAdminTravelTripDay(d, activitiesByDayId.get(d.tripDayId) ?? []));
        const packingItems = packingRows.map(toGqlAdminTravelTripPackingItem);
        return toGqlAdminTravelTrip(row, days, packingItems);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
