import { tool } from 'ai';
import { z } from 'zod';
import { financeRecurringCostsDelete } from '../commands/financeRecurringCostsDelete';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { FinanceAgentMutationLog } from './agentPersonalAssistantFinances';
import { requireAdminUserId } from './requireAdminUserId';

const toolFinanceRecurringCostsDeleteInputSchema = z.object({
    costIds: z.array(z.uuid()).min(1).describe('Recurring-cost row ids to permanently delete.'),
});

interface FinanceAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: FinanceAgentMutationLog;
}

export function toolFinanceRecurringCostsDelete({ serverRuntime, session, mutations }: FinanceAgentMutationContext) {
    return tool({
        description: [
            'Permanently delete one or more recurring costs. Use only when Cem explicitly says to delete / remove a',
            'cost for good. If he just stopped paying it but might want it back, prefer PAUSING instead — upsert the',
            'row with `active: false` via `financeRecurringCostsUpsert`, which keeps it in the ledger.',
        ].join(' '),
        inputSchema: toolFinanceRecurringCostsDeleteInputSchema,
        execute: async (input) => {
            const result = await financeRecurringCostsDelete(requireAdminUserId(session), input.costIds, session, serverRuntime);
            for (const costId of input.costIds) mutations.push({ kind: 'recurringCostDelete', id: costId });
            return result;
        },
    });
}
