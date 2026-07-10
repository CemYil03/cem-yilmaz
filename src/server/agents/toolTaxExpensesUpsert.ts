import { tool } from 'ai';
import { z } from 'zod';
import { adminTaxExpensesUpsert } from '../commands/adminTaxExpensesUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminTaxExpenseInputSchema } from '../graphql/generated';
import type { GqlSAdminTaxExpenseInput, GqlSSession } from '../graphql/generated';
import type { TaxAgentMutationLog } from './agentPersonalAssistantTax';
import { requireAdminUserId } from './requireAdminUserId';

// Batch create-or-edit of deductible expenses. Each row is
// `GqlSAdminTaxExpenseInputSchema()`. Gemini-safe: the only date field
// (`incurredOn`) is a `Date` scalar the codegen emits as `z.string()`, not
// `DateTime`. See `docs/architecture/agent-delegation.md#tool-input-schemas`.
const toolTaxExpensesUpsertInputSchema = z.object({
    taxExpenses: z.array(GqlSAdminTaxExpenseInputSchema()).min(1),
});

interface TaxAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: TaxAgentMutationLog;
}

export function toolTaxExpensesUpsert({ serverRuntime, session, mutations }: TaxAgentMutationContext) {
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
            const result = await adminTaxExpensesUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
            const referenceIds = result.referenceIds ?? [];
            inputs.forEach((exp, index) => {
                mutations.push({
                    kind: exp.expenseId ? 'expenseUpdate' : 'expenseAdd',
                    id: referenceIds[index] ?? exp.expenseId ?? '',
                    title: exp.description,
                });
            });
            return result;
        },
    });
}
