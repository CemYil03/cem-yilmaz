import { eq } from 'drizzle-orm';
import { shows } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationShowDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

export async function showDelete(
    userId: string,
    args: GqlSAdminMutationShowDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const [deleted] = await serverRuntime.db.delete(shows).where(eq(shows.showId, args.showId)).returning({ showId: shows.showId });
        if (!deleted) {
            throw new Error(`showDelete: row ${args.showId} not found`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
