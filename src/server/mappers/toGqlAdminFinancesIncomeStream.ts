import type { AdminFinancesIncomeStream } from '../db/schema';
import type { GqlSAdminFinancesIncomeStream } from '../graphql/generated';

// Scalar-only mapping — every column on the row maps 1:1 to a field on the
// GraphQL type. See `docs/features/workspace-finances.md`.
export function toGqlAdminFinancesIncomeStream(row: AdminFinancesIncomeStream): GqlSAdminFinancesIncomeStream {
    return {
        incomeStreamId: row.incomeStreamId,
        name: row.name,
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
