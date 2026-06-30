import { eq } from 'drizzle-orm';
import { compassInterviews } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationCompassInterviewEndArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// User-initiated early end. Transitions an `in_progress` interview to
// `completed` with `endReason='user_ended'`. The analyzer has already (or
// will shortly) processed whatever user messages exist; ending here just
// stops the interview from accepting further turns. No-op for any other
// status — the page will refetch and surface the current state.
export async function compassInterviewEnd(
    userId: string,
    args: GqlSAdminMutationCompassInterviewEndArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const result = await serverRuntime.db
            .update(compassInterviews)
            .set({
                status: 'completed',
                endReason: 'user_ended',
                completedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(compassInterviews.interviewId, args.interviewId))
            .returning({ interviewId: compassInterviews.interviewId });

        if (result.length === 0) {
            return { success: false, referenceId: null };
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: args.interviewId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
