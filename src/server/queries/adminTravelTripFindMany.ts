import { asc, desc, inArray, sql } from 'drizzle-orm';
import { adminTravelTripActivities, adminTravelTripDays, adminTravelTripPackingItems, adminTravelTrips } from '../db/schema';
import type { AdminTravelTripActivity, AdminTravelTripPackingItem } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminTravelTrip, GqlSAdminTravelTripDay, GqlSSession } from '../graphql/generated';
import { toGqlAdminTravelTrip } from '../mappers/toGqlAdminTravelTrip';
import { toGqlAdminTravelTripActivity } from '../mappers/toGqlAdminTravelTripActivity';
import { toGqlAdminTravelTripDay } from '../mappers/toGqlAdminTravelTripDay';
import { toGqlAdminTravelTripPackingItem } from '../mappers/toGqlAdminTravelTripPackingItem';

// Lists every trip with days (each pre-joined with activities) and packing
// items. Ordered `startsOn NULLS LAST, createdAt DESC` so upcoming and dated
// trips sit on top, drafts follow. The join fan-out is `medicalRecordList`'s
// shape: one query per relation, then normalize in memory. Trip volume is
// low (dozens), so hydrating the full graph on the list surface keeps the
// cards able to show `x/y packed` and day counts without a second fetch.
export async function adminTravelTripFindMany(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminTravelTrip[]> {
    try {
        const rows = await serverRuntime.db
            .select()
            .from(adminTravelTrips)
            .orderBy(sql`${adminTravelTrips.startsOn} DESC NULLS LAST`, desc(adminTravelTrips.createdAt), asc(adminTravelTrips.tripId));
        if (rows.length === 0) return [];

        const tripIds = rows.map((r) => r.tripId);

        const dayRows = await serverRuntime.db
            .select()
            .from(adminTravelTripDays)
            .where(inArray(adminTravelTripDays.tripId, tripIds))
            .orderBy(asc(adminTravelTripDays.tripId), asc(adminTravelTripDays.dayNumber));

        let activityRows: AdminTravelTripActivity[] = [];
        if (dayRows.length > 0) {
            const dayIds = dayRows.map((d) => d.tripDayId);
            activityRows = await serverRuntime.db
                .select()
                .from(adminTravelTripActivities)
                .where(inArray(adminTravelTripActivities.tripDayId, dayIds))
                .orderBy(
                    asc(adminTravelTripActivities.tripDayId),
                    asc(adminTravelTripActivities.position),
                    asc(adminTravelTripActivities.tripActivityId),
                );
        }

        const activitiesByDayId = new Map<string, GqlSAdminTravelTripDay['activities']>();
        for (const a of activityRows) {
            const list = activitiesByDayId.get(a.tripDayId) ?? [];
            list.push(toGqlAdminTravelTripActivity(a));
            activitiesByDayId.set(a.tripDayId, list);
        }

        const daysByTripId = new Map<string, GqlSAdminTravelTripDay[]>();
        for (const d of dayRows) {
            const list = daysByTripId.get(d.tripId) ?? [];
            list.push(toGqlAdminTravelTripDay(d, activitiesByDayId.get(d.tripDayId) ?? []));
            daysByTripId.set(d.tripId, list);
        }

        const packingRows: AdminTravelTripPackingItem[] = await serverRuntime.db
            .select()
            .from(adminTravelTripPackingItems)
            .where(inArray(adminTravelTripPackingItems.tripId, tripIds))
            .orderBy(
                asc(adminTravelTripPackingItems.tripId),
                asc(adminTravelTripPackingItems.category),
                asc(adminTravelTripPackingItems.position),
                asc(adminTravelTripPackingItems.tripPackingItemId),
            );

        const packingByTripId = new Map<string, ReturnType<typeof toGqlAdminTravelTripPackingItem>[]>();
        for (const p of packingRows) {
            const list = packingByTripId.get(p.tripId) ?? [];
            list.push(toGqlAdminTravelTripPackingItem(p));
            packingByTripId.set(p.tripId, list);
        }

        return rows.map((row) => toGqlAdminTravelTrip(row, daysByTripId.get(row.tripId) ?? [], packingByTripId.get(row.tripId) ?? []));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
