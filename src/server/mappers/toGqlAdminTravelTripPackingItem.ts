import type { AdminTravelTripPackingItem } from '../db/schema';
import type { GqlSAdminTravelTripPackingItem } from '../graphql/generated';

export function toGqlAdminTravelTripPackingItem(row: AdminTravelTripPackingItem): GqlSAdminTravelTripPackingItem {
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
