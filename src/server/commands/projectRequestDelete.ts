import { eq } from 'drizzle-orm';
import { projectRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationProjectRequestDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Permanent delete. The FK on `Projects.sourceRequestId` is `ON DELETE SET NULL`,
// so any project that was already converted from this request keeps its row
// — just loses the backlink. Reserve this for spam that survived OTP
// verification; use `projectRequestArchive` for the routine "no thanks" case.
export async function projectRequestDelete(
    userId: string,
    args: GqlSAdminMutationProjectRequestDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(projectRequests)
            .where(eq(projectRequests.projectRequestId, args.projectRequestId))
            .returning({ projectRequestId: projectRequests.projectRequestId });
        if (deleted.length === 0) {
            throw new Error(`projectRequestDelete: row ${args.projectRequestId} not found`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
