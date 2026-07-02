import type { ItemValuation } from '../db/schema';
import type { GqlSItemValuation } from '../graphql/generated';

export function toGqlItemValuation(row: ItemValuation): GqlSItemValuation {
    return {
        valuationId: row.valuationId,
        valueCents: row.valueCents,
        valuedAt: row.valuedAt,
        note: row.note,
    };
}
