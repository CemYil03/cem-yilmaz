import { tool } from 'ai';
import { z } from 'zod';
import { adminTaxIncomeSourcesUpsert } from '../commands/adminTaxIncomeSourcesUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminTaxIncomeSourceInputSchema } from '../graphql/generated';
import type { GqlSAdminTaxIncomeSourceInput, GqlSSession } from '../graphql/generated';
import type { TaxAgentMutationLog } from './agentPersonalAssistantTax';
import { requireAdminUserId } from './requireAdminUserId';

// Batch create-or-edit of income sources. Each row is
// `GqlSAdminTaxIncomeSourceInputSchema()` — no date fields, so Gemini-safe
// verbatim. See `docs/architecture/agent-delegation.md#tool-input-schemas`.
const toolTaxIncomeSourcesUpsertInputSchema = z.object({
    taxIncomeSources: z.array(GqlSAdminTaxIncomeSourceInputSchema()).min(1),
});

interface TaxAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: TaxAgentMutationLog;
}

export function toolTaxIncomeSourcesUpsert({ serverRuntime, session, mutations }: TaxAgentMutationContext) {
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
            const result = await adminTaxIncomeSourcesUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
            const referenceIds = result.referenceIds ?? [];
            inputs.forEach((src, index) => {
                mutations.push({
                    kind: src.incomeSourceId ? 'incomeSourceUpdate' : 'incomeSourceAdd',
                    id: referenceIds[index] ?? src.incomeSourceId ?? '',
                    title: src.label,
                });
            });
            return result;
        },
    });
}
