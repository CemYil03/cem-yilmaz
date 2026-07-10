import { inArray } from 'drizzle-orm';
import { foodLogEntries } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch delete of diary entries.
export async function foodLogEntriesDelete(
    userId: string,
    logIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(foodLogEntries)
            .where(inArray(foodLogEntries.logId, logIds as string[]))
            .returning({ logId: foodLogEntries.logId });
        if (deleted.length !== logIds.length) {
            const found = new Set(deleted.map((row) => row.logId));
            const missing = logIds.filter((id) => !found.has(id));
            throw new Error(`foodLogEntriesDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...logIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
