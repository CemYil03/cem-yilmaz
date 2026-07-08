import { asc, desc, inArray, sql } from 'drizzle-orm';
import { tripActivities, tripDays, tripPackingItems, trips } from '../db/schema';
import type { TripActivity, TripPackingItem } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession, GqlSTrip, GqlSTripDay } from '../graphql/generated';
import { toGqlTrip } from '../mappers/toGqlTrip';
import { toGqlTripActivity } from '../mappers/toGqlTripActivity';
import { toGqlTripDay } from '../mappers/toGqlTripDay';
import { toGqlTripPackingItem } from '../mappers/toGqlTripPackingItem';

// Lists every trip with days (each pre-joined with activities) and packing
// items. Ordered `startsOn NULLS LAST, createdAt DESC` so upcoming and dated
// trips sit on top, drafts follow. The join fan-out is `medicalRecordList`'s
// shape: one query per relation, then normalize in memory. Trip volume is
// low (dozens), so hydrating the full graph on the list surface keeps the
// cards able to show `x/y packed` and day counts without a second fetch.
export async function tripList(requestingSession: GqlSSession, serverRuntime: ServerRuntime): Promise<GqlSTrip[]> {
    try {
        const rows = await serverRuntime.db
            .select()
            .from(trips)
            .orderBy(sql`${trips.startsOn} DESC NULLS LAST`, desc(trips.createdAt), asc(trips.tripId));
        if (rows.length === 0) return [];

        const tripIds = rows.map((r) => r.tripId);

        const dayRows = await serverRuntime.db
            .select()
            .from(tripDays)
            .where(inArray(tripDays.tripId, tripIds))
            .orderBy(asc(tripDays.tripId), asc(tripDays.dayNumber));

        let activityRows: TripActivity[] = [];
        if (dayRows.length > 0) {
            const dayIds = dayRows.map((d) => d.tripDayId);
            activityRows = await serverRuntime.db
                .select()
                .from(tripActivities)
                .where(inArray(tripActivities.tripDayId, dayIds))
                .orderBy(asc(tripActivities.tripDayId), asc(tripActivities.position), asc(tripActivities.tripActivityId));
        }

        const activitiesByDayId = new Map<string, GqlSTripDay['activities']>();
        for (const a of activityRows) {
            const list = activitiesByDayId.get(a.tripDayId) ?? [];
            list.push(toGqlTripActivity(a));
            activitiesByDayId.set(a.tripDayId, list);
        }

        const daysByTripId = new Map<string, GqlSTripDay[]>();
        for (const d of dayRows) {
            const list = daysByTripId.get(d.tripId) ?? [];
            list.push(toGqlTripDay(d, activitiesByDayId.get(d.tripDayId) ?? []));
            daysByTripId.set(d.tripId, list);
        }

        const packingRows: TripPackingItem[] = await serverRuntime.db
            .select()
            .from(tripPackingItems)
            .where(inArray(tripPackingItems.tripId, tripIds))
            .orderBy(
                asc(tripPackingItems.tripId),
                asc(tripPackingItems.category),
                asc(tripPackingItems.position),
                asc(tripPackingItems.tripPackingItemId),
            );

        const packingByTripId = new Map<string, ReturnType<typeof toGqlTripPackingItem>[]>();
        for (const p of packingRows) {
            const list = packingByTripId.get(p.tripId) ?? [];
            list.push(toGqlTripPackingItem(p));
            packingByTripId.set(p.tripId, list);
        }

        return rows.map((row) => toGqlTrip(row, daysByTripId.get(row.tripId) ?? [], packingByTripId.get(row.tripId) ?? []));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
