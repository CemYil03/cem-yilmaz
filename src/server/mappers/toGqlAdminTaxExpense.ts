import type { AdminTaxExpense } from '../db/schema';
import type { GqlSAdminTaxExpense, GqlSAdminTaxFile } from '../graphql/generated';

// The caller loads and maps the attached files, then hands them in — same
// shape as `toGqlAdminMedicalRecord`. Every other column maps 1:1.
export function toGqlAdminTaxExpense(row: AdminTaxExpense, files: GqlSAdminTaxFile[]): GqlSAdminTaxExpense {
    return {
        expenseId: row.expenseId,
        incomeSourceId: row.incomeSourceId,
        categoryKey: row.categoryKey,
        description: row.description,
        amountCents: row.amountCents,
        incurredOn: row.incurredOn,
        deductible: row.deductible,
        notes: row.notes,
        files,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
