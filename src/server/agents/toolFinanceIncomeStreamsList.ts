import { tool } from 'ai';
import { z } from 'zod';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { adminFinancesIncomeStreamFindMany } from '../queries/adminFinancesIncomeStreamFindMany';

// Read-only list of every income stream. Prefer the snapshot in the system
// prompt first; reach for this only when the snapshot is stale mid-turn
// (e.g. after another tool wrote) or the agent needs the full payload.
interface FinanceAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolFinanceIncomeStreamsList({ serverRuntime, session }: FinanceAgentToolContext) {
    return tool({
        description: [
            'List every income stream (active and paused), ordered by name. Prefer the finances snapshot already',
            'in your system prompt — call this only when you need a fresh read mid-turn after a write.',
        ].join(' '),
        inputSchema: z.object({}),
        execute: async () => {
            return adminFinancesIncomeStreamFindMany(session, serverRuntime);
        },
    });
}
