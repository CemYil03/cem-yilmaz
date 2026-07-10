import type { AdminTravelTripDay } from '../db/schema';
import type { GqlSAdminTravelTripActivity, GqlSAdminTravelTripDay } from '../graphql/generated';

// `activities` is supplied by the caller — the loading query batches per day
// and passes the ordered slice in. Same shape as `toGqlMedicalRecord(row, files)`.
export function toGqlAdminTravelTripDay(row: AdminTravelTripDay, activities: GqlSAdminTravelTripActivity[]): GqlSAdminTravelTripDay {
    return {
        tripDayId: row.tripDayId,
        tripId: row.tripId,
        dayNumber: row.dayNumber,
        date: row.date,
        title: row.title,
        summary: row.summary,
        activities,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
