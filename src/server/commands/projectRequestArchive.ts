import { eq } from 'drizzle-orm';
import { projectRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationProjectRequestArchiveArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Flips an incoming request to `archived` without converting it to a
// project. The Inbox tab hides archived rows by default; admins can
// surface them again via a filter switch when needed.
export async function projectRequestArchive(
    userId: string,
    args: GqlSAdminMutationProjectRequestArchiveArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const updated = await serverRuntime.db
            .update(projectRequests)
            .set({ status: 'archived', updatedAt: new Date() })
            .where(eq(projectRequests.projectRequestId, args.projectRequestId))
            .returning({ projectRequestId: projectRequests.projectRequestId });
        if (updated.length === 0) {
            throw new Error(`projectRequestArchive: row ${args.projectRequestId} not found`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
