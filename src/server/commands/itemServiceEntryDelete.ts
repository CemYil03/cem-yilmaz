import { eq } from 'drizzle-orm';
import { itemServiceEntries } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationItemServiceEntryDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Delete a service entry. Any `ItemFiles` rows that pointed at it via
// `serviceEntryId` are preserved — the FK is `ON DELETE SET NULL` — so the
// invoice stays on the item's file list, unlinked from a specific event.
export async function itemServiceEntryDelete(
    userId: string,
    args: GqlSAdminMutationItemServiceEntryDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(itemServiceEntries)
            .where(eq(itemServiceEntries.serviceEntryId, args.serviceEntryId))
            .returning({ serviceEntryId: itemServiceEntries.serviceEntryId });
        if (deleted.length === 0) {
            throw new Error(`itemServiceEntryDelete: row ${args.serviceEntryId} not found`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
