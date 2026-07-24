import type { AdminTaxYear } from '../db/schema';
import type { GqlSAdminTaxDocument, GqlSAdminTaxExpense, GqlSAdminTaxIncomeSource, GqlSAdminTaxYear } from '../graphql/generated';

// The caller pre-loads and maps the children and pre-computes the totals, then
// hands them in — the year row itself maps 1:1. Totals live on the query, not
// here, because they aggregate across the children the caller already holds.
export function toGqlAdminTaxYear(
    row: AdminTaxYear,
    children: {
        incomeSources: GqlSAdminTaxIncomeSource[];
        expenses: GqlSAdminTaxExpense[];
        documents: GqlSAdminTaxDocument[];
        totalIncomeCents: number;
        totalDeductibleCents: number;
    },
): GqlSAdminTaxYear {
    return {
        taxYearId: row.taxYearId,
        year: row.year,
        status: row.status,
        filingDeadline: row.filingDeadline,
        submittedAt: row.submittedAt,
        notes: row.notes,
        incomeSources: children.incomeSources,
        expenses: children.expenses,
        documents: children.documents,
        totalIncomeCents: children.totalIncomeCents,
        totalDeductibleCents: children.totalDeductibleCents,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
