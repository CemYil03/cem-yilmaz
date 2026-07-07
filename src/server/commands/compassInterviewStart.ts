import { eq } from 'drizzle-orm';
import { compassInterviewMessages, compassInterviews } from '../db/schema';
import type { CompassInterviewMessageCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationCompassInterviewStartArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { agentCompassInterviewer } from '../agents/agentCompassInterviewer';

// Transitions a `pending` interview to `in_progress` and runs the first
// agent turn (no prior user messages — the agent opens with its question).
// Idempotent guard: if the interview is already in_progress, re-run the
// first turn only if no assistant message exists yet; otherwise no-op.
//
// The locale is taken from the requesting session so the agent's opening
// question lands in Cem's preferred UI language without needing him to type
// first. After the first user reply, the agent matches whatever language he
// wrote in.
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

        // Only run the opening turn when the transcript is empty. A repeated
        // `compassInterviewStart` (page reload, race) becomes a no-op rather
        // than producing a second opening question.
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

        if (!existingMessage) {
            const result = await agentCompassInterviewer({
                serverRuntime,
                messages: [],
                locale,
                topic: interview.topic,
            });
            if (result.content) {
                const insert: CompassInterviewMessageCreate = {
                    interviewMessageId: crypto.randomUUID(),
                    interviewId: interview.interviewId,
                    role: 'assistant',
                    content: result.content,
                    modelId: result.modelId,
                };
                await serverRuntime.db.insert(compassInterviewMessages).values(insert);
            }
            if (result.kind === 'concluded') {
                // Extremely unlikely on the opening turn — the prompt tells
                // the agent not to conclude before any user reply — but if
                // it happens, honor it rather than getting stuck.
                await serverRuntime.db
                    .update(compassInterviews)
                    .set({
                        status: 'completed',
                        endReason: 'agent_satisfied',
                        completedAt: new Date(),
                        updatedAt: new Date(),
                    })
                    .where(eq(compassInterviews.interviewId, interview.interviewId));
            }
        }

        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: interview.interviewId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
