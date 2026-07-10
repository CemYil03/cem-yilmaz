import type { AdminInventoryItemValuation } from '../db/schema';
import type { GqlSAdminInventoryItemValuation } from '../graphql/generated';

export function toGqlAdminInventoryItemValuation(row: AdminInventoryItemValuation): GqlSAdminInventoryItemValuation {
    return {
        valuationId: row.valuationId,
        valueCents: row.valueCents,
        valuedAt: row.valuedAt,
        note: row.note,
    };
}
