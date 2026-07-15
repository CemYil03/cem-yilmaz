import type { AdminTravelTripDay } from '../db/schema';
import type { GqlSAdminTravelTripActivity, GqlSAdminTravelTripDay } from '../graphql/generated';

// A day's calendar date is derived, never stored: for a dated trip it is the
// trip's `startsOn` advanced by `dayNumber - 1`; a dateless trip has none.
// `startsOn` and the return value are both `yyyy-MM-dd` (the `Date` scalar),
// so the arithmetic stays in UTC to avoid a local-tz off-by-one.
export function deriveDayDate(startsOn: string | null, dayNumber: number): string | null {
    if (!startsOn) return null;
    const start = new Date(`${startsOn}T00:00:00Z`);
    if (Number.isNaN(start.getTime())) return null;
    start.setUTCDate(start.getUTCDate() + (dayNumber - 1));
    return start.toISOString().slice(0, 10);
}

// `activities` is supplied by the caller — the loading query batches per day
// and passes the ordered slice in. Same shape as `toGqlAdminMedicalRecord(row, files)`.
// `tripStartsOn` is the parent trip's `startsOn`, threaded in so the day's
// derived `date` can never disagree with the trip's range.
export function toGqlAdminTravelTripDay(
    row: AdminTravelTripDay,
    activities: GqlSAdminTravelTripActivity[],
    tripStartsOn: string | null,
): GqlSAdminTravelTripDay {
    return {
        tripDayId: row.tripDayId,
        tripId: row.tripId,
        dayNumber: row.dayNumber,
        date: deriveDayDate(tripStartsOn, row.dayNumber),
        title: row.title,
        summary: row.summary,
        activities,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
