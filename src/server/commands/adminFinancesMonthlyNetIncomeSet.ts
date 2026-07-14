import { tool } from 'ai';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { adminFinancesSettings } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationAdminFinancesMonthlyNetIncomeSetArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Singleton setter — one settings row per admin, keyed by `userId`.
// `amountCents = null` clears the baseline (the Sankey then falls back to
// expenses only). The `userUpdates` subscription pushes the new totals to the
// page; `referenceId` echoes the settings row's `userId`.
export async function adminFinancesMonthlyNetIncomeSet(
    userId: string,
    args: GqlSAdminMutationAdminFinancesMonthlyNetIncomeSetArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();
    try {
        await serverRuntime.db
            .insert(adminFinancesSettings)
            .values({
                userId,
                monthlyNetIncomeCents: args.amountCents ?? null,
                updatedAt: now,
            })
            .onConflictDoUpdate({
                target: adminFinancesSettings.userId,
                set: {
                    monthlyNetIncomeCents: args.amountCents ?? null,
                    updatedAt: now,
                },
            });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: userId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

const toolFinanceMonthlyNetIncomeSetInputSchema = z.object({
    amountCents: z.number().nullable().describe('Monthly net income in cents (e.g. 3200 € → 320000). Pass null to clear the baseline.'),
});

interface FinanceAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolFinanceMonthlyNetIncomeSet({ serverRuntime, session }: FinanceAgentToolContext) {
    return tool({
        description: [
            "Set (or clear) Cem's monthly net income baseline — the number the finances overview uses to show how",
            'much is left after recurring costs. `amountCents` is the monthly take-home in cents; pass null to clear',
            'it. Use when Cem says something like "my monthly income is 3200 €" or "clear my income".',
        ].join(' '),
        inputSchema: toolFinanceMonthlyNetIncomeSetInputSchema,
        execute: async (input) => {
            return adminFinancesMonthlyNetIncomeSet(
                requireAdminUserId(session),
                { amountCents: input.amountCents ?? null },
                session,
                serverRuntime,
            );
        },
    });
}
