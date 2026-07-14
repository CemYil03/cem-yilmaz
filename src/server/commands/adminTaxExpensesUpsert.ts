import { tool } from 'ai';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { taxExpenses } from '../db/schema';
import type { AdminTaxExpenseCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminTaxExpenseInputSchema } from '../graphql/generated';
import type { GqlSAdminTaxExpenseInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch upsert of deductible expenses. Rows with an `expenseId` update, rows
// without insert. `deductible` defaults to true; `incomeSourceId` / `incurredOn`
// coalesce to null. `referenceIds` echoes the id per input row in input order.
export async function adminTaxExpensesUpsert(
    userId: string,
    inputs: readonly GqlSAdminTaxExpenseInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction.
    const rows = inputs.map((input) => {
        const expenseId = input.expenseId ?? crypto.randomUUID();
        const payload: AdminTaxExpenseCreate = {
            expenseId,
            taxYearId: input.taxYearId,
            incomeSourceId: input.incomeSourceId ?? null,
            categoryKey: input.categoryKey,
            description: input.description,
            amountCents: input.amountCents,
            incurredOn: input.incurredOn ?? null,
            deductible: input.deductible ?? true,
            notes: input.notes ?? null,
            updatedAt: now,
        };
        return { expenseId, isUpdate: Boolean(input.expenseId), payload };
    });

    // Phase 2 — transactional execution.
    try {
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.expenseId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ expenseId: taxExpenses.expenseId })
                    .from(taxExpenses)
                    .where(inArray(taxExpenses.expenseId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.expenseId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`adminTaxExpensesUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction.update(taxExpenses).set(row.payload).where(eq(taxExpenses.expenseId, row.expenseId));
                } else {
                    await transaction.insert(taxExpenses).values(row.payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.expenseId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

// Batch create-or-edit of deductible expenses. Each row is
// `GqlSAdminTaxExpenseInputSchema()`. Gemini-safe: the only date field
// (`incurredOn`) is a `Date` scalar the codegen emits as `z.string()`, not
// `DateTime`. See `docs/architecture/agent-delegation.md#tool-input-schemas`.
const toolTaxExpensesUpsertInputSchema = z.object({
    taxExpenses: z.array(GqlSAdminTaxExpenseInputSchema()).min(1),
});

interface TaxAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolTaxExpensesUpsert({ serverRuntime, session }: TaxAgentToolContext) {
    return tool({
        description: [
            'Batch create-or-edit of deductible expenses within a tax year — the "trag das als Ausgabe ein" path.',
            'Every row with an `expenseId` is updated; every row without one is inserted. Each row needs a `taxYearId`,',
            'a `description`, an `amountCents` (in cents), and a `categoryKey`: businessExpense=Betriebsausgabe (freelance',
            'costs), workRelated=Werbungskosten (employee job costs), insurance=Vorsorgeaufwendungen, specialExpenses=',
            'Sonderausgaben, homeOffice=Homeoffice-Pauschale, extraordinary=außergewöhnliche Belastungen, else other.',
            'Optionally link `incomeSourceId` to say which income it offsets, and set `incurredOn` (yyyy-mm-dd). You',
            'CANNOT attach a receipt file here — tell Cem to add it in the Expenses section of the tax page. Returns',
            '`referenceIds` in input order.',
        ].join(' '),
        inputSchema: toolTaxExpensesUpsertInputSchema,
        execute: async (rawInput) => {
            const inputs = rawInput.taxExpenses as GqlSAdminTaxExpenseInput[];
            return adminTaxExpensesUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
        },
    });
}
