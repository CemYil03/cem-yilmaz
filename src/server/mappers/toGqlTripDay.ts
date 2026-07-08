import type { TripDay } from '../db/schema';
import type { GqlSTripActivity, GqlSTripDay } from '../graphql/generated';

// `activities` is supplied by the caller — the loading query batches per day
// and passes the ordered slice in. Same shape as `toGqlMedicalRecord(row, files)`.
export function toGqlTripDay(row: TripDay, activities: GqlSTripActivity[]): GqlSTripDay {
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
