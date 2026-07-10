import type { AdminTravelTrip } from '../db/schema';
import type { GqlSAdminTravelTrip, GqlSAdminTravelTripDay, GqlSAdminTravelTripPackingItem } from '../graphql/generated';

// Trip with its hydrated days and packing items. The loading query owns the
// batching and passes ordered arrays in — identical to how
// `toGqlAdminMedicalRecord(row, files)` receives its files.
export function toGqlAdminTravelTrip(
    row: AdminTravelTrip,
    days: GqlSAdminTravelTripDay[],
    packingItems: GqlSAdminTravelTripPackingItem[],
): GqlSAdminTravelTrip {
    return {
        tripId: row.tripId,
        title: row.title,
        destination: row.destination,
        startsOn: row.startsOn,
        endsOn: row.endsOn,
        status: row.status,
        transportMode: row.transportMode,
        accommodation: row.accommodation,
        notes: row.notes,
        days,
        packingItems,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
