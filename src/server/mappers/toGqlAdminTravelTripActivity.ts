import type { AdminTravelTripActivity } from '../db/schema';
import type { GqlSAdminTravelTripActivity } from '../graphql/generated';

// Trivial pass-through — the wall-clock `startsAt` / `endsAt` are already
// strings in the DB, so no format conversion is needed at the mapper.
export function toGqlAdminTravelTripActivity(row: AdminTravelTripActivity): GqlSAdminTravelTripActivity {
    return {
        tripActivityId: row.tripActivityId,
        tripDayId: row.tripDayId,
        position: row.position,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        title: row.title,
        location: row.location,
        url: row.url,
        notes: row.notes,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
