import { tool } from 'ai';
import { z } from 'zod';
import { financeMonthlyNetIncomeSet } from '../commands/financeMonthlyNetIncomeSet';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { FinanceAgentMutationLog } from './agentPersonalAssistantFinances';
import { requireAdminUserId } from './requireAdminUserId';

const toolFinanceMonthlyNetIncomeSetInputSchema = z.object({
    amountCents: z.number().nullable().describe('Monthly net income in cents (e.g. 3200 € → 320000). Pass null to clear the baseline.'),
});

interface FinanceAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: FinanceAgentMutationLog;
}

export function toolFinanceMonthlyNetIncomeSet({ serverRuntime, session, mutations }: FinanceAgentMutationContext) {
    return tool({
        description: [
            "Set (or clear) Cem's monthly net income baseline — the number the finances overview uses to show how",
            'much is left after recurring costs. `amountCents` is the monthly take-home in cents; pass null to clear',
            'it. Use when Cem says something like "my monthly income is 3200 €" or "clear my income".',
        ].join(' '),
        inputSchema: toolFinanceMonthlyNetIncomeSetInputSchema,
        execute: async (input) => {
            const result = await financeMonthlyNetIncomeSet(
                requireAdminUserId(session),
                { amountCents: input.amountCents ?? null },
                session,
                serverRuntime,
            );
            mutations.push({ kind: 'monthlyNetIncomeSet', id: result.referenceId ?? '' });
            return result;
        },
    });
}
