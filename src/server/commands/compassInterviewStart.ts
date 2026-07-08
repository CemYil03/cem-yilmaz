import { eq } from 'drizzle-orm';
import { compassInterviewMessages, compassInterviews } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationCompassInterviewStartArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { compassInterviewTurnRunDetached } from './compassInterviewTurnRun';

// Transition a `pending` interview to `in_progress` and kick off the first
// agent turn detached. Returns as soon as the state transition commits;
// the opener's tokens ride the `compassInterviewUpdates` subscription.
//
// Idempotent: a repeated `compassInterviewStart` (page reload, race) becomes
// a no-op rather than producing a second opening question — the detached
// turn only fires when the transcript is empty.
export async function compassInterviewStart(
    userId: string,
    args: GqlSAdminMutationCompassInterviewStartArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
    locale: 'de' | 'en' = 'en',
): Promise<GqlSMutationResult> {
    try {
        const [interview] = await serverRuntime.db
            .select()
            .from(compassInterviews)
            .where(eq(compassInterviews.interviewId, args.interviewId))
            .limit(1);

        if (!interview) return { success: false, referenceId: null };
        if (interview.status === 'completed' || interview.status === 'skipped') {
            return { success: false, referenceId: null };
        }

        const [existingMessage] = await serverRuntime.db
            .select({ id: compassInterviewMessages.interviewMessageId })
            .from(compassInterviewMessages)
            .where(eq(compassInterviewMessages.interviewId, interview.interviewId))
            .limit(1);

        if (interview.status === 'pending') {
            await serverRuntime.db
                .update(compassInterviews)
                .set({ status: 'in_progress', startedAt: new Date(), updatedAt: new Date() })
                .where(eq(compassInterviews.interviewId, interview.interviewId));
        }

        // Push the state transition so the client's seed-and-subscribe hook
        // sees `status: 'in_progress'` before the streaming opener begins.
        await serverRuntime.publish.userUpdates({ userId });

        // Fire the opener detached only when the transcript is empty. A
        // repeated start (page reload, race) becomes a no-op.
        if (!existingMessage) {
            compassInterviewTurnRunDetached({
                interviewId: interview.interviewId,
                userId,
                generationId: args.generationId ?? null,
                locale,
                requestingSession,
                serverRuntime,
            });
        }

        return { success: true, referenceId: interview.interviewId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
