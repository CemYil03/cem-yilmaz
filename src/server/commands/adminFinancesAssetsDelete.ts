import { tool } from 'ai';
import { inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { financeAssets } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch hard delete of wealth assets. Valuation journal rows cascade.
// `active = false` is the softer alternative when an asset should drop out of
// totals but stay in the ledger. `referenceIds` echoes the deleted ids in
// input order.
export async function adminFinancesAssetsDelete(
    userId: string,
    assetIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(financeAssets)
            .where(inArray(financeAssets.assetId, assetIds as string[]))
            .returning({ assetId: financeAssets.assetId });
        if (deleted.length !== assetIds.length) {
            const found = new Set(deleted.map((row) => row.assetId));
            const missing = assetIds.filter((id) => !found.has(id));
            throw new Error(`adminFinancesAssetsDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...assetIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

const toolFinanceAssetsDeleteInputSchema = z.object({
    assetIds: z.array(z.uuid()).min(1).describe('Wealth-asset row ids to permanently delete.'),
});

interface FinanceAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolFinanceAssetsDelete({ serverRuntime, session }: FinanceAgentToolContext) {
    return tool({
        description: [
            'Permanently delete one or more wealth assets. Use only when Cem explicitly says to delete / remove an',
            'asset for good. If he just wants it out of the totals, prefer PAUSING — upsert with `active: false`.',
        ].join(' '),
        inputSchema: toolFinanceAssetsDeleteInputSchema,
        execute: async (input) => {
            return adminFinancesAssetsDelete(requireAdminUserId(session), input.assetIds, session, serverRuntime);
        },
    });
}
