import { tool } from 'ai';
import { z } from 'zod';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { adminFinancesRecurringCostFindMany } from '../queries/adminFinancesRecurringCostFindMany';

// Full recurring-cost read tool. The system-prompt snapshot already lists
// every cost with its amount, cadence, active flag, and id inline; use this
// only when the sub-agent needs the fully typed shape (e.g. to echo a cost's
// `notes` or `currency` verbatim), which the snapshot trims.

const financeRecurringCostsListInputSchema = z.object({});

interface FinanceAgentReadContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolFinanceRecurringCostsList({ serverRuntime, session }: FinanceAgentReadContext) {
    return tool({
        description: [
            'List every recurring cost (active and paused) with fully hydrated fields. Use only when the snapshot',
            'in the system prompt is not enough — for example when Cem asks for the exact notes or currency on a cost.',
        ].join(' '),
        inputSchema: financeRecurringCostsListInputSchema,
        execute: async () => {
            return adminFinancesRecurringCostFindMany(session, serverRuntime);
        },
    });
}
