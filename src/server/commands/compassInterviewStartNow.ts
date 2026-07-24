import { eq, or } from 'drizzle-orm';
import type { CompassInterviewTopic } from '../agents/compassInterviewConfig';
import { compassInterviews } from '../db/schema';
import type { CompassInterviewCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationCompassInterviewStartNowArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Manually create a `pending` interview, off the cron cadence. Same guard as
// the recurring `compassInterviewScheduledDue` handler: if an interview is
// already open (`pending` or `in_progress`), no-op and return that row's id
// so the caller can navigate to it rather than surfacing an error. This
// keeps the "at most one open interview at a time" invariant the whole
// feature rests on — see `docs/features/compass.md` ("Cadence and
// idempotency").
//
// `topic` defaults to 'general' when omitted. Passed through to
// `compassInterviews.topic` so the interviewer agent can sharpen its focus.
//
// `compassInterviewStart` is a separate concern: it transitions an existing
// `pending` row to `in_progress` and runs the agent's opening turn. The
// page uses this command to conjure the row, then calls `Start` (via the
// existing PendingInterviewCard flow) to begin the conversation.
export async function compassInterviewStartNow(
    userId: string,
    args: GqlSAdminMutationCompassInterviewStartNowArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const [existing] = await serverRuntime.db
            .select({ interviewId: compassInterviews.interviewId })
            .from(compassInterviews)
            .where(or(eq(compassInterviews.status, 'pending'), eq(compassInterviews.status, 'in_progress')))
            .limit(1);

        if (existing) {
            return { success: true, referenceId: existing.interviewId };
        }

        const topic: CompassInterviewTopic = (args.topic as CompassInterviewTopic | undefined) ?? 'general';
        const insert: CompassInterviewCreate = {
            interviewId: crypto.randomUUID(),
            status: 'pending',
            dueAt: new Date(),
            triggerReason: 'manual',
            topic,
            observationCount: 0,
        };
        await serverRuntime.db.insert(compassInterviews).values(insert);
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: insert.interviewId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
