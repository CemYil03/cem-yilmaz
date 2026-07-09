import { eq } from 'drizzle-orm';
import { financeRecurringCosts } from '../db/schema';
import type { FinanceRecurringCostCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationFinanceRecurringCostUpsertArgs, GqlSFinanceRecurringCost, GqlSSession } from '../graphql/generated';
import { toGqlFinanceRecurringCost } from '../mappers/toGqlFinanceRecurringCost';

// Two-phase upsert — same shape as `itemUpsert`. `costId` set → update;
// absent → insert. Optional-in-GraphQL fields (`currency`, `active`,
// `notes`, `startsOn`, `endsOn`) coalesce to their column defaults or null
// so a partial payload from the "New cost" dialog produces a sensible row.
export async function financeRecurringCostUpsert(
    userId: string,
    args: GqlSAdminMutationFinanceRecurringCostUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSFinanceRecurringCost> {
    const { input } = args;
    const now = new Date();

    try {
        if (input.costId) {
            const [updated] = await serverRuntime.db
                .update(financeRecurringCosts)
                .set({
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
                })
                .where(eq(financeRecurringCosts.costId, input.costId))
                .returning();
            if (!updated) throw new Error(`financeRecurringCostUpsert: row ${input.costId} not found`);
            await serverRuntime.publish.userUpdates({ userId });
            return toGqlFinanceRecurringCost(updated);
        }

        const payload: FinanceRecurringCostCreate = {
            costId: crypto.randomUUID(),
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
        const [inserted] = await serverRuntime.db.insert(financeRecurringCosts).values(payload).returning();
        if (!inserted) throw new Error('financeRecurringCostUpsert: insert returned no rows');
        await serverRuntime.publish.userUpdates({ userId });
        return toGqlFinanceRecurringCost(inserted);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
