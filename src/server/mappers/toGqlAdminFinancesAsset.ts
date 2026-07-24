import type { AdminFinancesAsset } from '../db/schema';
import type { GqlSAdminFinancesAsset } from '../graphql/generated';

// Scalar-only mapping — every column on the row maps 1:1 to a field on the
// GraphQL type. See `docs/features/workspace-finances.md`.
export function toGqlAdminFinancesAsset(row: AdminFinancesAsset): GqlSAdminFinancesAsset {
    return {
        assetId: row.assetId,
        kind: row.kind,
        name: row.name,
        location: row.location,
        currentValueCents: row.currentValueCents,
        shares: row.shares ?? null,
        symbol: row.symbol,
        isin: row.isin,
        currency: row.currency,
        notes: row.notes,
        active: row.active,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
