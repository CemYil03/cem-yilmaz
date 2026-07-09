import { eq } from 'drizzle-orm';
import { adminFinancesSettings } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';

// Returns the admin's `monthlyNetIncomeCents` or null. Null covers all of:
// no session user, no row yet, or an explicitly cleared baseline — the
// finances UI treats them the same.
export async function adminFinancesMonthlyNetIncomeCentsFindOne(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<number | null> {
    if (!requestingSession.userId) return null;
    try {
        const [row] = await serverRuntime.db
            .select({ monthlyNetIncomeCents: adminFinancesSettings.monthlyNetIncomeCents })
            .from(adminFinancesSettings)
            .where(eq(adminFinancesSettings.userId, requestingSession.userId));
        return row?.monthlyNetIncomeCents ?? null;
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
