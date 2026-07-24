import { tool } from 'ai';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { financeRecurringCosts } from '../db/schema';
import type { AdminFinancesRecurringCostCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminFinancesRecurringCostInputSchema } from '../graphql/generated';
import type { GqlSAdminFinancesRecurringCostInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch upsert of recurring costs. Every row with a `costId` is updated;
// every row without one is inserted under a freshly-minted UUID. The whole
// batch runs inside a single transaction so a failure anywhere rolls the
// batch back — nothing lands half-written. Optional-in-GraphQL fields
// (`currency`, `active`, `notes`, `startsOn`, `endsOn`) coalesce to their
// column defaults or null so a partial payload from the "New cost" dialog
// produces a sensible row. `referenceIds` echoes the id per input row (in
// input order) so the caller can address newly-created rows without a
// follow-up read.
export async function adminFinancesRecurringCostsUpsert(
    userId: string,
    inputs: readonly GqlSAdminFinancesRecurringCostInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction.
    const rows = inputs.map((input) => {
        const costId = input.costId ?? crypto.randomUUID();
        const payload: AdminFinancesRecurringCostCreate = {
            costId,
            name: input.name,
            categoryKey: input.categoryKey,
            amountCents: input.amountCents,
            cadence: input.cadence,
            currency: input.currency ?? 'EUR',
            notes: input.notes ?? null,
            active: input.active ?? true,
            startsOn: input.startsOn ?? null,
            endsOn: input.endsOn ?? null,
            updatedAt: now,
        };
        return { costId, isUpdate: Boolean(input.costId), payload };
    });

    // Phase 2 — transactional execution.
    try {
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.costId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ costId: financeRecurringCosts.costId })
                    .from(financeRecurringCosts)
                    .where(inArray(financeRecurringCosts.costId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.costId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`adminFinancesRecurringCostsUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction.update(financeRecurringCosts).set(row.payload).where(eq(financeRecurringCosts.costId, row.costId));
                } else {
                    await transaction.insert(financeRecurringCosts).values(row.payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.costId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

// Batch create-or-edit of recurring costs. Each row is
// `GqlSAdminFinancesRecurringCostInputSchema()` — the same shape the resolver
// validates. Gemini-safe: `AdminFinancesRecurringCostInput`'s only date fields
// (`startsOn` / `endsOn`) are `Date` scalars the codegen emits as
// `z.string()`, not `DateTime` (`z.date()`), so no hand-built duplicate is
// needed. See `docs/architecture/agent-delegation.md#tool-input-schemas`.
const toolFinanceRecurringCostsUpsertInputSchema = z.object({
    financeRecurringCosts: z.array(GqlSAdminFinancesRecurringCostInputSchema()).min(1),
});

interface FinanceAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolFinanceRecurringCostsUpsert({ serverRuntime, session }: FinanceAgentToolContext) {
    return tool({
        description:
            'Batch upsert recurring costs/subscriptions. `amountCents` is cents for one cadence period. Infer cadence from phrasing (default monthly). Pick `categoryKey` from the enum. Pause with `active: false`. Returns `referenceIds` in order.',
        inputSchema: toolFinanceRecurringCostsUpsertInputSchema,
        execute: async (rawInput) => {
            const inputs = rawInput.financeRecurringCosts as GqlSAdminFinancesRecurringCostInput[];
            return adminFinancesRecurringCostsUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
        },
    });
}
