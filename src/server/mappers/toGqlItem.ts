import type { Item } from '../db/schema';
import type { GqlSItem } from '../graphql/generated';

// Scalar-only mapping. The list resolver hands the row through with
// `valuations` / `serviceEntries` / `files` empty; the singular `item(id)`
// resolver overwrites those with real arrays after loading. Mirrors how
// `projectsList` returns bare projects and `projectGet` returns full ones —
// see `docs/features/workspace-inventory.md`.
export function toGqlItem(row: Item): GqlSItem {
    return {
        itemId: row.itemId,
        categoryKey: row.categoryKey,
        name: row.name,
        brand: row.brand,
        model: row.model,
        serialNumber: row.serialNumber,
        purchasedAt: row.purchasedAt,
        purchasePriceCents: row.purchasePriceCents,
        currentValueCents: row.currentValueCents,
        condition: row.condition,
        disposalState: row.disposalState,
        disposedAt: row.disposedAt,
        warrantyEndsAt: row.warrantyEndsAt,
        warrantyProvider: row.warrantyProvider,
        warrantyNotes: row.warrantyNotes,
        notes: row.notes,
        valuations: [],
        serviceEntries: [],
        files: [],
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
