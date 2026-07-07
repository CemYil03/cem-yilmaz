import { desc, eq, or } from 'drizzle-orm';
import { compass, compassInterviews } from '../../db/schema';
import type { CompassInterviewCreate } from '../../db/schema';
import type { CompassInterviewTopic } from '../../agents/compassInterviewConfig';
import { COMPASS_INTERVIEW_CRON, COMPASS_INTERVIEW_TOPIC_ROTATION } from '../../agents/compassInterviewConfig';
import { COMPASS_SINGLETON_ID } from '../../agents/compassConfig';
import type { RecurringJobDefinition } from '../types';

// Scheduled cron — see `docs/features/compass.md` ("Psychological-interview
// agent"). Fires on the cadence set by `COMPASS_INTERVIEW_CRON` (the cron
// expression is the single source of truth — change it there, not here) and
// inserts a `pending` interview row that Cem can start the next time he
// opens `/workspace/compass`.
//
// TOPIC SELECTION (in priority order):
// 1. AI-suggested hint on the Compass row — if `scheduledInterviewAt` is in
//    the past (due), use that topic and clear the hint.
// 2. Rotation fallback — look at the last completed/skipped interview's topic
//    and take the next entry in `COMPASS_INTERVIEW_TOPIC_ROTATION`.
//
// IDEMPOTENT. The handler short-circuits when an open interview (pending or
// in_progress) already exists, so:
//
// - Two firings in the same minute (pg-boss redelivery, manual replay) do
//   not produce two pending rows.
// - A tick where Cem never opened the previous pending interview does not
//   pile a second one on top — he sees the existing one when he comes back.
// - A worker crash that misses a firing simply resumes on the next one.
//
// `endReason`/`completedAt` stay null; they only fill in on transitions.
export const compassInterviewScheduledDue: RecurringJobDefinition = {
    kind: 'recurring',
    name: 'compass-interview-scheduled-due',
    cron: COMPASS_INTERVIEW_CRON,
    handler: async ({ serverRuntime }) => {
        try {
            const [existing] = await serverRuntime.db
                .select({ interviewId: compassInterviews.interviewId, status: compassInterviews.status })
                .from(compassInterviews)
                .where(or(eq(compassInterviews.status, 'pending'), eq(compassInterviews.status, 'in_progress')))
                .limit(1);

            if (existing) {
                serverRuntime.log.info(
                    `compassInterviewScheduledDue: open interview ${existing.interviewId} (status=${existing.status}) already exists — skipping`,
                );
                return;
            }

            const now = new Date();

            // Check for an AI-suggested schedule hint first.
            const [compassRow] = await serverRuntime.db
                .select({
                    scheduledInterviewTopic: compass.scheduledInterviewTopic,
                    scheduledInterviewAt: compass.scheduledInterviewAt,
                })
                .from(compass)
                .where(eq(compass.compassId, COMPASS_SINGLETON_ID))
                .limit(1);

            let topic: CompassInterviewTopic = 'general';
            let clearHint = false;

            if (compassRow?.scheduledInterviewAt && compassRow.scheduledInterviewAt <= now && compassRow.scheduledInterviewTopic) {
                // AI hint is due — use it.
                topic = compassRow.scheduledInterviewTopic as CompassInterviewTopic;
                clearHint = true;
                serverRuntime.log.info(`compassInterviewScheduledDue: using AI hint topic=${topic}`);
            } else {
                // Rotation fallback — step to the next topic after the last completed/skipped one.
                const [last] = await serverRuntime.db
                    .select({ topic: compassInterviews.topic })
                    .from(compassInterviews)
                    .where(or(eq(compassInterviews.status, 'completed'), eq(compassInterviews.status, 'skipped')))
                    .orderBy(desc(compassInterviews.completedAt))
                    .limit(1);

                const rawTopic = last?.topic;
                const lastTopic: CompassInterviewTopic =
                    rawTopic && COMPASS_INTERVIEW_TOPIC_ROTATION.includes(rawTopic) ? rawTopic : 'general';
                const idx = COMPASS_INTERVIEW_TOPIC_ROTATION.indexOf(lastTopic);
                topic = COMPASS_INTERVIEW_TOPIC_ROTATION[(idx + 1) % COMPASS_INTERVIEW_TOPIC_ROTATION.length] ?? 'general';
                serverRuntime.log.info(`compassInterviewScheduledDue: rotation lastTopic=${lastTopic} → topic=${topic}`);
            }

            const insert: CompassInterviewCreate = {
                interviewId: crypto.randomUUID(),
                status: 'pending',
                dueAt: now,
                triggerReason: 'scheduled',
                topic,
                observationCount: 0,
            };
            await serverRuntime.db.insert(compassInterviews).values(insert);
            serverRuntime.log.info(`compassInterviewScheduledDue: created pending interview ${insert.interviewId} (topic=${topic})`);

            if (clearHint) {
                await serverRuntime.db
                    .update(compass)
                    .set({ scheduledInterviewTopic: null, scheduledInterviewAt: null, scheduledInterviewReason: null, updatedAt: now })
                    .where(eq(compass.compassId, COMPASS_SINGLETON_ID));
            }
        } catch (error) {
            serverRuntime.log.error(error, null);
            throw error;
        }
    },
    options: {
        retryLimit: 2,
        retryDelay: 120,
        expireInSeconds: 60,
    },
};
