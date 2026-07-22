import { tool } from 'ai';
import { inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { financeIncomeStreams } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch hard delete of income streams. `active = false` is the softer
// alternative when a stream should stay in the list but stop counting.
export async function adminFinancesIncomeStreamsDelete(
    userId: string,
    incomeStreamIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(financeIncomeStreams)
            .where(inArray(financeIncomeStreams.incomeStreamId, incomeStreamIds as string[]))
            .returning({ incomeStreamId: financeIncomeStreams.incomeStreamId });
        if (deleted.length !== incomeStreamIds.length) {
            const found = new Set(deleted.map((row) => row.incomeStreamId));
            const missing = incomeStreamIds.filter((id) => !found.has(id));
            throw new Error(`adminFinancesIncomeStreamsDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...incomeStreamIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

const toolFinanceIncomeStreamsDeleteInputSchema = z.object({
    incomeStreamIds: z.array(z.uuid()).min(1).describe('Income-stream row ids to permanently delete.'),
});

interface FinanceAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolFinanceIncomeStreamsDelete({ serverRuntime, session }: FinanceAgentToolContext) {
    return tool({
        description: [
            'Permanently delete one or more income streams. Use only when Cem explicitly says to delete / remove a',
            'stream for good. If he just stopped receiving it but might want it back, prefer PAUSING instead —',
            'upsert the row with `active: false` via `financeIncomeStreamsUpsert`, which keeps it in the list.',
        ].join(' '),
        inputSchema: toolFinanceIncomeStreamsDeleteInputSchema,
        execute: async (input) => {
            return adminFinancesIncomeStreamsDelete(requireAdminUserId(session), input.incomeStreamIds, session, serverRuntime);
        },
    });
}
