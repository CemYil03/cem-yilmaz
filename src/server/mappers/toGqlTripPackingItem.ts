import type { TripPackingItem } from '../db/schema';
import type { GqlSTripPackingItem } from '../graphql/generated';

export function toGqlTripPackingItem(row: TripPackingItem): GqlSTripPackingItem {
    return {
        tripPackingItemId: row.tripPackingItemId,
        tripId: row.tripId,
        category: row.category,
        label: row.label,
        quantity: row.quantity,
        packed: row.packed,
        position: row.position,
        notes: row.notes,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
