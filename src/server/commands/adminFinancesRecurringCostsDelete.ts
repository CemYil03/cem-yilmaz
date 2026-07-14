import { tool } from 'ai';
import { inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { financeRecurringCosts } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch hard delete of recurring costs. Rows are self-contained — no
// satellites, no FK cascades to unwind. `active = false` is the softer
// alternative the UI exposes when a subscription is paused but should stay in
// the ledger. `referenceIds` echoes the deleted ids in input order — a
// caller-supplied id that never existed makes the batch throw (same posture
// as the singular delete had).
export async function adminFinancesRecurringCostsDelete(
    userId: string,
    costIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(financeRecurringCosts)
            .where(inArray(financeRecurringCosts.costId, costIds as string[]))
            .returning({ costId: financeRecurringCosts.costId });
        if (deleted.length !== costIds.length) {
            const found = new Set(deleted.map((row) => row.costId));
            const missing = costIds.filter((id) => !found.has(id));
            throw new Error(`adminFinancesRecurringCostsDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...costIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

const toolFinanceRecurringCostsDeleteInputSchema = z.object({
    costIds: z.array(z.uuid()).min(1).describe('Recurring-cost row ids to permanently delete.'),
});

interface FinanceAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolFinanceRecurringCostsDelete({ serverRuntime, session }: FinanceAgentToolContext) {
    return tool({
        description: [
            'Permanently delete one or more recurring costs. Use only when Cem explicitly says to delete / remove a',
            'cost for good. If he just stopped paying it but might want it back, prefer PAUSING instead — upsert the',
            'row with `active: false` via `financeRecurringCostsUpsert`, which keeps it in the ledger.',
        ].join(' '),
        inputSchema: toolFinanceRecurringCostsDeleteInputSchema,
        execute: async (input) => {
            return adminFinancesRecurringCostsDelete(requireAdminUserId(session), input.costIds, session, serverRuntime);
        },
    });
}
