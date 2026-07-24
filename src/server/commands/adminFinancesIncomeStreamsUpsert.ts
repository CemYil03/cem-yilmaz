import { tool } from 'ai';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { financeIncomeStreams } from '../db/schema';
import type { AdminFinancesIncomeStreamCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminFinancesIncomeStreamInputSchema } from '../graphql/generated';
import type { GqlSAdminFinancesIncomeStreamInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch upsert of income streams. Every row with an `incomeStreamId` is
// updated; every row without one is inserted under a freshly-minted UUID.
// The whole batch runs inside a single transaction so a failure anywhere
// rolls the batch back. Optional-in-GraphQL fields coalesce to their column
// defaults or null. `referenceIds` echoes the id per input row in input
// order.
export async function adminFinancesIncomeStreamsUpsert(
    userId: string,
    inputs: readonly GqlSAdminFinancesIncomeStreamInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction.
    const rows = inputs.map((input) => {
        const incomeStreamId = input.incomeStreamId ?? crypto.randomUUID();
        const payload: AdminFinancesIncomeStreamCreate = {
            incomeStreamId,
            name: input.name,
            amountCents: input.amountCents,
            cadence: input.cadence,
            currency: input.currency ?? 'EUR',
            notes: input.notes ?? null,
            active: input.active ?? true,
            startsOn: input.startsOn ?? null,
            endsOn: input.endsOn ?? null,
            updatedAt: now,
        };
        return { incomeStreamId, isUpdate: Boolean(input.incomeStreamId), payload };
    });

    // Phase 2 — transactional execution.
    try {
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.incomeStreamId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ incomeStreamId: financeIncomeStreams.incomeStreamId })
                    .from(financeIncomeStreams)
                    .where(inArray(financeIncomeStreams.incomeStreamId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.incomeStreamId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`adminFinancesIncomeStreamsUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction
                        .update(financeIncomeStreams)
                        .set(row.payload)
                        .where(eq(financeIncomeStreams.incomeStreamId, row.incomeStreamId));
                } else {
                    await transaction.insert(financeIncomeStreams).values(row.payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.incomeStreamId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

const toolFinanceIncomeStreamsUpsertInputSchema = z.object({
    financeIncomeStreams: z.array(GqlSAdminFinancesIncomeStreamInputSchema()).min(1),
});

interface FinanceAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolFinanceIncomeStreamsUpsert({ serverRuntime, session }: FinanceAgentToolContext) {
    return tool({
        description:
            'Batch upsert income streams. `amountCents` is cents for one cadence period; infer cadence (default monthly). Pause with `active: false`. Returns `referenceIds` in order.',
        inputSchema: toolFinanceIncomeStreamsUpsertInputSchema,
        execute: async (rawInput) => {
            const inputs = rawInput.financeIncomeStreams as GqlSAdminFinancesIncomeStreamInput[];
            return adminFinancesIncomeStreamsUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
        },
    });
}
