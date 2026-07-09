import { inArray } from 'drizzle-orm';
import { itemServiceEntries } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch delete of service entries. Any `ItemFiles` rows that pointed at an
// entry via `serviceEntryId` are preserved — the FK is `ON DELETE SET NULL` —
// so the invoice stays on the item's file list, unlinked from a specific
// event. `referenceIds` echoes the deleted ids in input order; a
// caller-supplied id that never existed makes the batch throw.
export async function itemServiceEntriesDelete(
    userId: string,
    serviceEntryIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(itemServiceEntries)
            .where(inArray(itemServiceEntries.serviceEntryId, serviceEntryIds as string[]))
            .returning({ serviceEntryId: itemServiceEntries.serviceEntryId });
        if (deleted.length !== serviceEntryIds.length) {
            const found = new Set(deleted.map((row) => row.serviceEntryId));
            const missing = serviceEntryIds.filter((id) => !found.has(id));
            throw new Error(`itemServiceEntriesDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...serviceEntryIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
