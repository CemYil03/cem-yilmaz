import { tool } from 'ai';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { taxIncomeSources } from '../db/schema';
import type { AdminTaxIncomeSourceCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminTaxIncomeSourceInputSchema } from '../graphql/generated';
import type { GqlSAdminTaxIncomeSourceInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch upsert of income sources. Rows with an `incomeSourceId` update, rows
// without insert. `grossAmountCents` coalesces to null (figure not yet known).
// `referenceIds` echoes the id per input row in input order.
export async function adminTaxIncomeSourcesUpsert(
    userId: string,
    inputs: readonly GqlSAdminTaxIncomeSourceInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction.
    const rows = inputs.map((input) => {
        const incomeSourceId = input.incomeSourceId ?? crypto.randomUUID();
        const payload: AdminTaxIncomeSourceCreate = {
            incomeSourceId,
            taxYearId: input.taxYearId,
            kind: input.kind,
            label: input.label,
            grossAmountCents: input.grossAmountCents ?? null,
            notes: input.notes ?? null,
            updatedAt: now,
        };
        return { incomeSourceId, isUpdate: Boolean(input.incomeSourceId), payload };
    });

    // Phase 2 — transactional execution.
    try {
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.incomeSourceId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ incomeSourceId: taxIncomeSources.incomeSourceId })
                    .from(taxIncomeSources)
                    .where(inArray(taxIncomeSources.incomeSourceId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.incomeSourceId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`adminTaxIncomeSourcesUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction
                        .update(taxIncomeSources)
                        .set(row.payload)
                        .where(eq(taxIncomeSources.incomeSourceId, row.incomeSourceId));
                } else {
                    await transaction.insert(taxIncomeSources).values(row.payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.incomeSourceId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

// Batch create-or-edit of income sources. Each row is
// `GqlSAdminTaxIncomeSourceInputSchema()` — no date fields, so Gemini-safe
// verbatim. See `docs/architecture/agent-delegation.md#tool-input-schemas`.
const toolTaxIncomeSourcesUpsertInputSchema = z.object({
    taxIncomeSources: z.array(GqlSAdminTaxIncomeSourceInputSchema()).min(1),
});

interface TaxAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolTaxIncomeSourcesUpsert({ serverRuntime, session }: TaxAgentToolContext) {
    return tool({
        description: [
            'Batch create-or-edit of income sources within a tax year. Every row with an `incomeSourceId` is updated;',
            'every row without one is inserted. Each row needs a `taxYearId` and a `kind` (employment=Anlage N,',
            'selfEmployment=Anlage S, business=Anlage G, minijob, capital=Anlage KAP). `grossAmountCents` is the gross',
            'income in cents; omit it if not yet known. Returns `referenceIds` in input order.',
        ].join(' '),
        inputSchema: toolTaxIncomeSourcesUpsertInputSchema,
        execute: async (rawInput) => {
            const inputs = rawInput.taxIncomeSources as GqlSAdminTaxIncomeSourceInput[];
            return adminTaxIncomeSourcesUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
        },
    });
}
