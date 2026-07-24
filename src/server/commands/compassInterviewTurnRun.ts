import { asc, eq } from 'drizzle-orm';
import { agentCompassInterviewerGenerate, agentCompassInterviewerStream } from '../agents/agentCompassInterviewer';
import { compassInterviewMessages, compassInterviews } from '../db/schema';
import type { CompassInterviewMessageCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { compassAnalyze } from '../jobs/handlers/compassAnalyze';

// Runs one interview turn: loads the transcript, drives the interviewer
// agent (streamed when a `generationId` is present, single-shot otherwise),
// persists the assistant row, and transitions the interview to `completed`
// if the agent called `concludeInterview`. Modelled on `chatAssistantTurnRun`
// (`src/server/commands/chatAssistantTurnRun.ts`) but scoped to the compass
// interview's simpler shape: no tool-call persistence, no approval lifecycle,
// no input-collection. See `docs/features/workspace-compass.md`.
//
// Streamed path: every `text-delta` from the AI SDK is forwarded on
// `publish.compassInterviewUpdates` as an `assistantTextChunk` keyed by the
// pre-allocated `interviewMessageId` — the client uses the same id to swap
// its streaming preview row for the persisted `messageAppended` at
// end-of-stream, with no layout shift. On every exit path (success, agent
// throw, downstream publish error) a `turnEnded` fires from the `finally`.

export interface CompassInterviewTurnRunOptions {
    interviewId: string;
    userId: string;
    // Client-allocated ephemeral id keyed by the transcript's live-updates
    // subscription. Null means "no live UI" — tests and any future
    // scheduled-job caller fall back to `generateText`.
    generationId: string | null;
    locale: 'de' | 'en';
    requestingSession: GqlSSession;
    serverRuntime: ServerRuntime;
}

async function compassInterviewTurnRun({
    interviewId,
    userId,
    generationId,
    locale,
    requestingSession,
    serverRuntime,
}: CompassInterviewTurnRunOptions): Promise<void> {
    // Pre-allocate the id of the eventual assistant-message row so streamed
    // chunk events carry it and the client can swap its streaming preview
    // for the persisted row without a layout shift.
    const assistantMessageId = crypto.randomUUID();
    let concluded = false;

    try {
        const [interview] = await serverRuntime.db
            .select()
            .from(compassInterviews)
            .where(eq(compassInterviews.interviewId, interviewId))
            .limit(1);
        if (!interview) return;
        // Completed / skipped interviews never accept a new turn. `pending`
        // is turned into `in_progress` by the command that kicks this off
        // (see `compassInterviewStart` / `compassInterviewMessageSend`), so
        // we should be looking at `in_progress` here.
        if (interview.status !== 'in_progress') return;

        // Load the transcript here — inside the detached async — so the
        // just-written user row (in the calling command) is visible. Mirrors
        // `chatAssistantTurnRunDetached`'s re-read for the same reason.
        const transcript = await serverRuntime.db
            .select({ role: compassInterviewMessages.role, content: compassInterviewMessages.content })
            .from(compassInterviewMessages)
            .where(eq(compassInterviewMessages.interviewId, interview.interviewId))
            .orderBy(asc(compassInterviewMessages.createdAt), asc(compassInterviewMessages.interviewMessageId));

        const messages = transcript.map((row) => ({ role: row.role, content: row.content }));

        const result = generationId
            ? await agentCompassInterviewerStream({
                  serverRuntime,
                  messages,
                  locale,
                  topic: interview.topic,
                  onDelta: async (delta) => {
                      await serverRuntime.publish.compassInterviewUpdates({
                          generationId,
                          payload: {
                              kind: 'assistantTextChunk',
                              interviewMessageId: assistantMessageId,
                              delta,
                          },
                      });
                  },
              })
            : await agentCompassInterviewerGenerate({
                  serverRuntime,
                  messages,
                  locale,
                  topic: interview.topic,
              });

        // Persist the assistant row when the agent produced any text. When
        // `concludeInterview` is called with no accompanying closing line
        // (the agent left `text` empty), skip the row — nothing to show and
        // the row would be visually noise on the completed transcript.
        if (result.content) {
            const assistantInsert: CompassInterviewMessageCreate = {
                interviewMessageId: assistantMessageId,
                interviewId: interview.interviewId,
                role: 'assistant',
                content: result.content,
                modelId: result.modelId,
            };
            await serverRuntime.db.insert(compassInterviewMessages).values(assistantInsert);
            if (generationId) {
                await serverRuntime.publish.compassInterviewUpdates({
                    generationId,
                    payload: { kind: 'messageAppended', interviewMessageId: assistantMessageId },
                });
            }
        }

        // Transition the interview row on conclusion. `endNote` is logged
        // rather than persisted on the row — the row's audit fields are
        // enough; the note lives only in the agent's prompt for that turn
        // and the surrounding log.
        if (result.kind === 'concluded') {
            concluded = true;
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
                serverRuntime.log.info(`compassInterviewTurnRun: concluded ${interview.interviewId} — ${result.endNote}`);
            }
        }

        // Fire the userUpdates push so the page's seed-and-subscribe hook
        // sees status transitions (in_progress → completed) and any
        // observation-count bump the analyzer produced downstream.
        await serverRuntime.publish.userUpdates({ userId });
    } finally {
        // `turnEnded` runs on every path out so the client always tears
        // down its per-turn composer lock + streaming row, even when the
        // turn produced no assistant text or the agent threw. Best-effort
        // — a publish failure here is logged, not thrown.
        if (generationId) {
            try {
                await serverRuntime.publish.compassInterviewUpdates({
                    generationId,
                    payload: { kind: 'turnEnded', generationId, concluded },
                });
            } catch (publishError) {
                serverRuntime.log.error(publishError, requestingSession);
            }
        }
    }
}

/**
 * Kick a compass-interview turn off on a void promise. Returns synchronously
 * so the mutation can resolve as soon as the user-side row is durable; the
 * agent runs detached and emits `turnEnded` when done. Mirrors
 * `chatAssistantTurnRunDetached`.
 */
export function compassInterviewTurnRunDetached(options: CompassInterviewTurnRunOptions): void {
    void (async () => {
        try {
            await compassInterviewTurnRun(options);
        } catch (turnError) {
            options.serverRuntime.log.error(turnError, options.requestingSession);
        }
    })();
}

/**
 * Enqueue the compass analyzer for a user interview message, log on failure,
 * never throw. Mirrors the `try/catch/log` around the analyzer enqueue in
 * `compassInterviewMessageSend` — extracted here because both the send
 * command and (potentially in future) other interview-flow commands need
 * the same shape.
 */
export async function compassInterviewAnalyzerEnqueue(
    userInterviewMessageId: string,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<void> {
    try {
        await serverRuntime.jobs.enqueue(compassAnalyze, { interviewMessageId: userInterviewMessageId });
    } catch (enqueueError) {
        serverRuntime.log.error(enqueueError, requestingSession);
    }
}
