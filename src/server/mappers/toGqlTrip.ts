import type { Trip } from '../db/schema';
import type { GqlSTrip, GqlSTripDay, GqlSTripPackingItem } from '../graphql/generated';

// Trip with its hydrated days and packing items. The loading query owns the
// batching and passes ordered arrays in — identical to how
// `toGqlMedicalRecord(row, files)` receives its files.
export function toGqlTrip(row: Trip, days: GqlSTripDay[], packingItems: GqlSTripPackingItem[]): GqlSTrip {
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
