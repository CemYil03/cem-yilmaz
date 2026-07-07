import { asc, eq } from 'drizzle-orm';
import { compassInterviewMessages, compassInterviews } from '../db/schema';
import type { CompassInterviewMessageCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationCompassInterviewMessageSendArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { agentCompassInterviewer } from '../agents/agentCompassInterviewer';
import { compassAnalyze } from '../jobs/handlers/compassAnalyze';

// Append a user message to an in-progress interview, run the agent for one
// turn, persist the assistant reply, and — if the agent called
// `concludeInterview` — transition the interview row to `completed`.
//
// Order matters: the user message is persisted FIRST so the analyzer (which
// we enqueue against the new message id) and the agent both see it. The
// analyzer enqueue happens fire-and-forget after the assistant turn lands,
// mirroring the admin-chat path in `chatMessageCreate.ts` so an analyzer
// failure never blocks the conversation.
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

        // 2) Load full transcript (now including the just-persisted user msg)
        //    and run the agent for one turn.
        const transcript = await serverRuntime.db
            .select({ role: compassInterviewMessages.role, content: compassInterviewMessages.content })
            .from(compassInterviewMessages)
            .where(eq(compassInterviewMessages.interviewId, interview.interviewId))
            .orderBy(asc(compassInterviewMessages.createdAt), asc(compassInterviewMessages.interviewMessageId));

        const result = await agentCompassInterviewer({
            serverRuntime,
            messages: transcript.map((row) => ({ role: row.role, content: row.content })),
            locale,
            topic: interview.topic,
        });

        // 3) Persist the assistant turn — even when concluded, if the agent
        //    wrote a closing line, keep it.
        if (result.content) {
            const assistantInsert: CompassInterviewMessageCreate = {
                interviewMessageId: crypto.randomUUID(),
                interviewId: interview.interviewId,
                role: 'assistant',
                content: result.content,
                modelId: result.modelId,
            };
            await serverRuntime.db.insert(compassInterviewMessages).values(assistantInsert);
        }

        // 4) If the agent concluded, transition the row. `endNote` is logged
        //    rather than persisted on the row — the row's audit fields are
        //    enough; the note lives only in the agent's prompt for that turn
        //    and the surrounding log.
        if (result.kind === 'concluded') {
            await serverRuntime.db
                .update(compassInterviews)
                .set({
                    status: 'completed',
                    endReason: 'agent_satisfied',
                    completedAt: new Date(),
                    updatedAt: new Date(),
                })
                .where(eq(compassInterviews.interviewId, interview.interviewId));
            if (result.endNote) {
                serverRuntime.log.info(`compassInterviewMessageSend: concluded ${interview.interviewId} — ${result.endNote}`);
            }
        }

        // 5) Fire-and-forget analyzer enqueue for the user message. Same
        //    pattern as `chatMessageCreate.ts` for admin chats — log on
        //    enqueue failure but never block the turn.
        try {
            await serverRuntime.jobs.enqueue(compassAnalyze, { interviewMessageId: userMessageId });
        } catch (enqueueError) {
            serverRuntime.log.error(enqueueError, requestingSession);
        }

        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: interview.interviewId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
