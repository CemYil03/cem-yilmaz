import { eq, inArray } from 'drizzle-orm';
import { taxDocuments, taxYears } from '../db/schema';
import type { AdminTaxDocumentCreate, AdminTaxYearCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminTaxYearInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { TAX_DEFAULT_CHECKLIST } from './taxDefaultChecklist';

// Batch upsert of tax years. Every row with a `taxYearId` is updated; every
// row without one is inserted under a freshly-minted UUID — and its default
// document checklist (see `taxDefaultChecklist`) is seeded in the same
// transaction. `submittedAt` is stamped server-side when `status` reaches
// `submitted` and cleared when it moves away, so the client only ever sets
// `status`. `referenceIds` echoes the id per input row in input order.
export async function adminTaxYearsUpsert(
    userId: string,
    inputs: readonly GqlSAdminTaxYearInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction.
    const rows = inputs.map((input) => {
        const taxYearId = input.taxYearId ?? crypto.randomUUID();
        const isUpdate = Boolean(input.taxYearId);
        const status = input.status ?? 'open';
        const payload: AdminTaxYearCreate = {
            taxYearId,
            year: input.year,
            status,
            filingDeadline: input.filingDeadline ?? null,
            submittedAt: status === 'submitted' ? now : null,
            notes: input.notes ?? null,
            updatedAt: now,
        };
        return { taxYearId, isUpdate, payload };
    });

    // Phase 2 — transactional execution.
    try {
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.taxYearId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ taxYearId: taxYears.taxYearId })
                    .from(taxYears)
                    .where(inArray(taxYears.taxYearId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.taxYearId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`adminTaxYearsUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction.update(taxYears).set(row.payload).where(eq(taxYears.taxYearId, row.taxYearId));
                } else {
                    await transaction.insert(taxYears).values(row.payload);
                    const checklist: AdminTaxDocumentCreate[] = TAX_DEFAULT_CHECKLIST.map((doc) => ({
                        documentId: crypto.randomUUID(),
                        taxYearId: row.taxYearId,
                        kind: doc.kind,
                        title: doc.title,
                        status: 'needed',
                        updatedAt: now,
                    }));
                    await transaction.insert(taxDocuments).values(checklist);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.taxYearId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
