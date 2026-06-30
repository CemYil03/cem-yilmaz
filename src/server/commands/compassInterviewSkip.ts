import { and, eq } from 'drizzle-orm';
import { compassInterviews } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationCompassInterviewSkipArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Skip a `pending` interview without starting it. Transitions the row to
// `skipped` with `endReason='skipped'` so the cron's idempotency check
// (which guards on "any pending row exists") clears, and next week's
// invocation will insert a fresh pending row. No-op for any other status —
// only pending interviews can be skipped.
export async function compassInterviewSkip(
    userId: string,
    args: GqlSAdminMutationCompassInterviewSkipArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const result = await serverRuntime.db
            .update(compassInterviews)
            .set({
                status: 'skipped',
                endReason: 'skipped',
                completedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(and(eq(compassInterviews.interviewId, args.interviewId), eq(compassInterviews.status, 'pending')))
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
