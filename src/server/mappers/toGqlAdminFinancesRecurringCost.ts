import type { AdminFinancesRecurringCost } from '../db/schema';
import type { GqlSAdminFinancesRecurringCost } from '../graphql/generated';

// Scalar-only mapping — every column on the row maps 1:1 to a field on the
// GraphQL type. See `docs/features/workspace-finances.md`.
export function toGqlAdminFinancesRecurringCost(row: AdminFinancesRecurringCost): GqlSAdminFinancesRecurringCost {
    return {
        costId: row.costId,
        name: row.name,
        categoryKey: row.categoryKey,
        amountCents: row.amountCents,
        cadence: row.cadence,
        currency: row.currency,
        notes: row.notes,
        active: row.active,
        startsOn: row.startsOn,
        endsOn: row.endsOn,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
