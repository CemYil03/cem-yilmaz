import { eq } from 'drizzle-orm';
import { items } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationItemDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Cascade removes valuations, service entries, and file joins (schema
// FKs). The underlying `FileUploads` rows are preserved — same posture as
// `projectFiles`, they belong to the user, not the item.
export async function itemDelete(
    userId: string,
    args: GqlSAdminMutationItemDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db.delete(items).where(eq(items.itemId, args.itemId)).returning({ itemId: items.itemId });
        if (deleted.length === 0) {
            throw new Error(`itemDelete: row ${args.itemId} not found`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
