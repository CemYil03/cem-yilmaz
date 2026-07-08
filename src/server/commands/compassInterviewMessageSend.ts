import { eq } from 'drizzle-orm';
import { compassInterviewMessages, compassInterviews } from '../db/schema';
import type { CompassInterviewMessageCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationCompassInterviewMessageSendArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { compassInterviewAnalyzerEnqueue, compassInterviewTurnRunDetached } from './compassInterviewTurnRun';

// Append a user reply to an in-progress interview, kick off the next agent
// turn detached, and return to the caller as soon as the user row is
// durable. The agent's reply lands on the `compassInterviewUpdates`
// subscription (streamed deltas + a final `messageAppended`) and — if the
// agent calls `concludeInterview` — flips the interview row to `completed`
// on the same detached path. Mirrors `chatMessageCreate`'s "commit user row
// → return; detached assistant turn" split.
export async function compassInterviewMessageSend(
    userId: string,
    args: GqlSAdminMutationCompassInterviewMessageSendArgs,
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
        if (interview.status !== 'in_progress') {
            // Pending hasn't been started yet; completed/skipped can't accept
            // new messages. Either way the client should re-load and surface
            // whatever state the row is actually in.
            return { success: false, referenceId: null };
        }

        const trimmed = args.content.trim();
        if (!trimmed) return { success: false, referenceId: null };

        // 1) Persist the user message.
        const userMessageId = crypto.randomUUID();
        const userInsert: CompassInterviewMessageCreate = {
            interviewMessageId: userMessageId,
            interviewId: interview.interviewId,
            role: 'user',
            content: trimmed,
            modelId: null,
        };
        await serverRuntime.db.insert(compassInterviewMessages).values(userInsert);

        // 2) Publish the user row so the transcript hydrates it before the
        //    agent turn lands. Only fires when the client allocated a
        //    generationId (missing it means "no live UI" — bare API caller).
        const generationId = args.generationId ?? null;
        if (generationId) {
            await serverRuntime.publish.compassInterviewUpdates({
                generationId,
                payload: { kind: 'messageAppended', interviewMessageId: userMessageId },
            });
        }

        // 3) Fire-and-forget analyzer for the user message. Same pattern
        //    as `chatMessageCreate.ts` — log on enqueue failure but never
        //    block the turn.
        await compassInterviewAnalyzerEnqueue(userMessageId, requestingSession, serverRuntime);

        // 4) Detached agent turn. Returns synchronously; deltas + final row
        //    + `turnEnded` all ride the subscription.
        compassInterviewTurnRunDetached({
            interviewId: interview.interviewId,
            userId,
            generationId,
            locale,
            requestingSession,
            serverRuntime,
        });

        return { success: true, referenceId: interview.interviewId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
