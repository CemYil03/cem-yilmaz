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
