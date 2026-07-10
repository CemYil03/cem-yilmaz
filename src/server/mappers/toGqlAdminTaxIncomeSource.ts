import type { AdminTaxIncomeSource } from '../db/schema';
import type { GqlSAdminTaxIncomeSource } from '../graphql/generated';

// Scalar-only mapping — every column maps 1:1 to a field on the GraphQL type.
// See `docs/features/workspace-tax.md`.
export function toGqlAdminTaxIncomeSource(row: AdminTaxIncomeSource): GqlSAdminTaxIncomeSource {
    return {
        incomeSourceId: row.incomeSourceId,
        kind: row.kind,
        label: row.label,
        grossAmountCents: row.grossAmountCents,
        notes: row.notes,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
