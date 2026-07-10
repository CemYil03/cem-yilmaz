import { asc, desc, inArray } from 'drizzle-orm';
import { fileUploads, taxDocuments, taxExpenses, taxFiles, taxIncomeSources, taxYears } from '../db/schema';
import type { AdminTaxFile, FileUpload } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminTaxFile, GqlSAdminTaxYear, GqlSSession } from '../graphql/generated';
import { toGqlAdminTaxDocument } from '../mappers/toGqlAdminTaxDocument';
import { toGqlAdminTaxExpense } from '../mappers/toGqlAdminTaxExpense';
import { toGqlAdminTaxFile } from '../mappers/toGqlAdminTaxFile';
import { toGqlAdminTaxIncomeSource } from '../mappers/toGqlAdminTaxIncomeSource';
import { toGqlAdminTaxYear } from '../mappers/toGqlAdminTaxYear';

// Lists every tax year with its income sources, expenses (+ receipt files),
// and checklist documents (+ scan files), newest year first. The join fan-out
// is the `adminMedicalRecordFindMany` pattern: one query per relation, then
// normalize in memory. Totals are computed here because they aggregate across
// the children this query already holds.
export async function adminTaxYearFindMany(requestingSession: GqlSSession, serverRuntime: ServerRuntime): Promise<GqlSAdminTaxYear[]> {
    try {
        const years = await serverRuntime.db.select().from(taxYears).orderBy(desc(taxYears.year));
        if (years.length === 0) return [];

        const yearIds = years.map((y) => y.taxYearId);

        const [incomeRows, expenseRows, documentRows, fileRows] = await Promise.all([
            serverRuntime.db
                .select()
                .from(taxIncomeSources)
                .where(inArray(taxIncomeSources.taxYearId, yearIds))
                .orderBy(asc(taxIncomeSources.kind), asc(taxIncomeSources.label)),
            serverRuntime.db
                .select()
                .from(taxExpenses)
                .where(inArray(taxExpenses.taxYearId, yearIds))
                .orderBy(asc(taxExpenses.categoryKey), desc(taxExpenses.incurredOn)),
            serverRuntime.db
                .select()
                .from(taxDocuments)
                .where(inArray(taxDocuments.taxYearId, yearIds))
                .orderBy(asc(taxDocuments.status), asc(taxDocuments.title)),
            serverRuntime.db
                .select()
                .from(taxFiles)
                .where(inArray(taxFiles.taxYearId, yearIds))
                .orderBy(desc(taxFiles.pinned), desc(taxFiles.createdAt)),
        ]);

        // Resolve the paired uploads once for every file join.
        const uploadsById = new Map<string, FileUpload>();
        if (fileRows.length > 0) {
            const uploadIds = Array.from(new Set(fileRows.map((f) => f.fileUploadId)));
            const uploadRows = await serverRuntime.db.select().from(fileUploads).where(inArray(fileUploads.fileUploadId, uploadIds));
            for (const u of uploadRows) uploadsById.set(u.fileUploadId, u);
        }

        // Map a file join to its GraphQL shape, skipping any whose upload was
        // deleted out-of-band (the parent still surfaces).
        const mapFile = (f: AdminTaxFile): GqlSAdminTaxFile | null => {
            const upload = uploadsById.get(f.fileUploadId);
            return upload ? toGqlAdminTaxFile(f, upload) : null;
        };

        // Group file joins by expense and by document.
        const filesByExpenseId = new Map<string, GqlSAdminTaxFile[]>();
        const filesByDocumentId = new Map<string, GqlSAdminTaxFile[]>();
        for (const f of fileRows) {
            const mapped = mapFile(f);
            if (!mapped) continue;
            if (f.expenseId) {
                const list = filesByExpenseId.get(f.expenseId) ?? [];
                list.push(mapped);
                filesByExpenseId.set(f.expenseId, list);
            }
            if (f.documentId) {
                const list = filesByDocumentId.get(f.documentId) ?? [];
                list.push(mapped);
                filesByDocumentId.set(f.documentId, list);
            }
        }

        // Group children by year.
        const incomeByYear = groupBy(incomeRows, (r) => r.taxYearId);
        const expenseByYear = groupBy(expenseRows, (r) => r.taxYearId);
        const documentByYear = groupBy(documentRows, (r) => r.taxYearId);

        return years.map((year) => {
            const incomeSources = (incomeByYear.get(year.taxYearId) ?? []).map(toGqlAdminTaxIncomeSource);
            const expenses = (expenseByYear.get(year.taxYearId) ?? []).map((e) =>
                toGqlAdminTaxExpense(e, filesByExpenseId.get(e.expenseId) ?? []),
            );
            const documents = (documentByYear.get(year.taxYearId) ?? []).map((d) =>
                toGqlAdminTaxDocument(d, filesByDocumentId.get(d.documentId) ?? []),
            );
            const totalIncomeCents = incomeSources.reduce((sum, s) => sum + (s.grossAmountCents ?? 0), 0);
            const totalDeductibleCents = expenses.reduce((sum, e) => sum + (e.deductible ? e.amountCents : 0), 0);
            return toGqlAdminTaxYear(year, { incomeSources, expenses, documents, totalIncomeCents, totalDeductibleCents });
        });
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

function groupBy<T, TKey>(rows: T[], key: (row: T) => TKey): Map<TKey, T[]> {
    const map = new Map<TKey, T[]>();
    for (const row of rows) {
        const k = key(row);
        const list = map.get(k) ?? [];
        list.push(row);
        map.set(k, list);
    }
    return map;
}
