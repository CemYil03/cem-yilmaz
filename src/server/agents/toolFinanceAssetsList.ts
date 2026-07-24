import { tool } from 'ai';
import { z } from 'zod';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { adminFinancesAssetFindMany } from '../queries/adminFinancesAssetFindMany';

interface FinanceAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

// Read-only list for the finances sub-agent when the inlined snapshot is not
// enough (e.g. looking up a paused asset by name). Same rows the Wealth tab
// shows.
export function toolFinanceAssetsList({ serverRuntime, session }: FinanceAgentToolContext) {
    return tool({
        description:
            'List every wealth asset (active and inactive), ordered by kind then name. Prefer the snapshot when it already answers the question.',
        inputSchema: z.object({}),
        execute: async () => adminFinancesAssetFindMany(session, serverRuntime),
    });
}
