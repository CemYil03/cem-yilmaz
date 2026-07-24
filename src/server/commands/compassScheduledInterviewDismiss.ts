import { eq } from 'drizzle-orm';
import { COMPASS_SINGLETON_ID } from '../agents/compassConfig';
import { compass } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Clear the AI-suggested schedule hint on the Compass singleton row without
// acting on it. Called when Cem dismisses the suggestion card on
// `/workspace/compass`. The hint fields (`scheduledInterviewTopic/At/Reason`)
// are set to null so the card disappears; the next analyzer pass can set a
// new hint if fresh signal warrants it.
export async function compassScheduledInterviewDismiss(
    userId: string,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        await serverRuntime.db
            .update(compass)
            .set({
                scheduledInterviewTopic: null,
                scheduledInterviewAt: null,
                scheduledInterviewReason: null,
                updatedAt: new Date(),
            })
            .where(eq(compass.compassId, COMPASS_SINGLETON_ID));
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
